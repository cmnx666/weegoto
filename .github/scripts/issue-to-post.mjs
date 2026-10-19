import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { parse, stringify } = createRequire(import.meta.url)('yaml');
const HEADERS = ['文章标题', '署名', '链接短名（选填）', '标签（选填）', '一句话摘要', '正文', '发布前确认'];
export function parseIssueForm(body) {
  const out = {};
  let current = null, buffer = [], fence = null;
  const flush = () => { if (current) out[current] = buffer.join('\n').trim(); };
  for (const line of body.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line);
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.char && marker[1].length >= fence.length && /^\s*(`+|~+)\s*$/.test(line)) fence = null;
    }
    const heading = !fence && /^###\s+(.+?)\s*$/.exec(line);
    const label = heading?.[1];
    // Inside the body, only the final consent field is a delimiter.
    const hit = HEADERS.includes(label) && (current !== '正文' || label === '发布前确认');
    if (hit) {
      flush();
      if (Object.hasOwn(out, label)) throw new Error(`表单字段重复：${label}`);
      current = label; buffer = [];
    } else if (current) buffer.push(line);
  }
  flush();
  return out;
}
const raw = value => String(value ?? '').trim() === '_No response_' ? '' : String(value ?? '').trim();
const oneLine = (value, max=200) => raw(value).replace(/\s+/g, ' ').slice(0,max);
const slugify = value => raw(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,48);
export function generatePost(env = process.env, root = process.cwd()) {
  const issue = String(env.ISSUE_NUMBER ?? '');
  if (!/^[1-9]\d*$/.test(issue)) throw new Error('无效 Issue 编号');
  const fields = parseIssueForm(env.ISSUE_BODY ?? '');
  const title = oneLine(fields['文章标题'], 120);
  const description = oneLine(fields['一句话摘要']);
  const originalContent = raw(fields['正文']);
  const wrapper = /^(`{3,})(?:markdown|md)\r?\n([\s\S]*)\r?\n\1$/.exec(originalContent);
  const content = wrapper ? wrapper[2].trim() : originalContent;
  if (!title || !description || !content) throw new Error('文章标题、摘要和正文必须填写');
  const terms = raw(fields['发布前确认']);
  const checks = terms.split(/\r?\n/).filter(line => /^-\s*\[/.test(line));
  if(checks.length !== 3 || checks.some(line => !/^-\s*\[[xX]\]/.test(line))) throw new Error('必须逐项同意三项发布条款');
  const directory = path.join(root, 'src/content/notes');
  fs.mkdirSync(directory, { recursive: true });
  const existing = fs.readdirSync(directory).filter(file => file.endsWith('.md')).map(file => {
    const text = fs.readFileSync(path.join(directory,file), 'utf8');
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    return { file, meta: fm ? parse(fm[1]) : {} };
  });
  const matches = existing.filter(item => item.meta?.source === 'guest' && String(item.meta?.issue) === issue);
  if(matches.length > 1) throw new Error('同一投稿存在多篇文章，请先合并');
  let slug = matches.length ? matches[0].file.slice(0,-3) : slugify(fields['链接短名（选填）']) || `guest-${issue}`;
  if (!matches.length && fs.existsSync(path.join(directory,slug+'.md'))) slug += '-'+issue;
  const file = path.join(directory,slug+'.md');
  if (!matches.length && fs.existsSync(file)) throw new Error('目标短名已存在');
  const date = matches[0]?.meta?.date || new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  const meta = { title, description, date, tags: raw(fields['标签（选填）']).split(/[,，、]/).map(t=>oneLine(t,24)).filter(Boolean).slice(0,5), draft:false,
    author:oneLine(fields['署名']) || `匿名访客（GitHub @${oneLine(env.ISSUE_LOGIN,39)}）`, source:'guest', issue };
  fs.writeFileSync(file, '---\n'+stringify(meta)+'---\n\n'+content+'\n','utf8');
  if(env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `slug=${slug}\n`);
  return {slug, file};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log('已生成投稿：', generatePost().slug); }
  catch(error) { console.error(error.message); process.exitCode = 1; }
}
