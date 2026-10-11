/**
 * 把一条「投稿心得」Issue 转换成 src/content/notes/<slug>.md
 *
 * 触发方式：项目组在 Issue 上打上「已采纳」标签
 *          → .github/workflows/publish-submission.yml 调用本脚本
 *
 * 环境变量（由工作流注入，避免把用户内容拼进 shell）：
 *   ISSUE_BODY     Issue 正文（Issue Form 渲染后的 Markdown）
 *   ISSUE_NUMBER   Issue 编号
 *   ISSUE_TITLE    Issue 标题
 *   ISSUE_LOGIN    提交者的 GitHub 用户名
 *
 * 输出（写入 $GITHUB_OUTPUT）：
 *   file=src/content/notes/xxx.md
 *   slug=xxx
 */

import fs from 'node:fs';
import path from 'node:path';

// --- Issue Form 里的字段标签（必须与 submit-note.yml 保持一致）--------------
const FIELDS = {
  title: '文章标题',
  author: '署名',
  slug: '链接短名',
  tags: '标签',
  summary: '一句话摘要',
  content: '正文',
  terms: '发布前确认',
};

const CONSENT_COUNT = 3;

// --- 工具 -------------------------------------------------------------------

const die = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};

/**
 * 解析 Issue Form 渲染出来的正文。
 *
 * 形如：
 *   ### 文章标题
 *
 *   我的标题
 *
 *   ### 正文
 *
 *   ## 小标题        ← 用户自己的 Markdown 标题，不能被当成字段
 *
 * 所以这里只把「已知字段标签」当作分隔点，其余 ### 一律留在内容里。
 */
function parseIssueForm(body) {
  const known = Object.values(FIELDS);
  const out = {};
  let current = null;
  let buf = [];

  const flush = () => {
    if (current) out[current] = buf.join('\n').trim();
  };

  for (const line of body.split(/\r?\n/)) {
    const m = /^###\s+(.+?)\s*$/.exec(line);
    const hit = m ? known.find((k) => m[1] === k || m[1].startsWith(k)) : null;

    if (hit) {
      flush();
      current = hit;
      buf = [];
    } else if (current) {
      buf.push(line);
    }
  }
  flush();
  return out;
}

/** 把值压成一行，并去掉会破坏手写 frontmatter 解析器的字符 */
function oneLine(value, { max = 200 } = {}) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/["""'']/g, '')
    .replace(/\\/g, '')
    .trim()
    .slice(0, max);
}

/** 生成安全的 slug：只允许小写字母、数字、连字符 */
function toSlug(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** 检查三项同意条款是否全部勾选 */
function checkConsent(text) {
  const checked = (text.match(/^-\s*\[[xX]\]/gm) || []).length;
  const unchecked = (text.match(/^-\s*\[\s*\]/gm) || []).length;
  return { checked, unchecked, ok: checked >= CONSENT_COUNT && unchecked === 0 };
}

// --- 主流程 -----------------------------------------------------------------

const issueBody = process.env.ISSUE_BODY ?? '';
const issueNumber = process.env.ISSUE_NUMBER ?? '';
const issueTitle = process.env.ISSUE_TITLE ?? '';
const issueLogin = process.env.ISSUE_LOGIN ?? '';

if (!issueBody.trim()) die('Issue 正文为空，无法生成文章');

const fields = parseIssueForm(issueBody);
console.log('解析到的字段：', Object.keys(fields).join(' / '));

// 1) 必填校验
const title = oneLine(fields[FIELDS.title] || issueTitle.replace(/^\[投稿\]\s*/, ''), { max: 120 });
const summary = oneLine(fields[FIELDS.summary], { max: 200 });
const content = (fields[FIELDS.content] || '').trim();

if (!title) die(`缺少必填字段：${FIELDS.title}`);
if (!summary) die(`缺少必填字段：${FIELDS.summary}`);
if (!content) die(`缺少必填字段：${FIELDS.content}`);

// 2) 同意条款校验（伦理红线，必须逐项勾选）
const consent = checkConsent(fields[FIELDS.terms] || '');
if (!consent.ok) {
  die(
    `同意条款未全部勾选（已勾 ${consent.checked} 项，未勾 ${consent.unchecked} 项）。` +
      '三项都必须勾选才能发布 —— 这是隐私与版权的必要确认。'
  );
}
console.log('✅ 同意条款：三项已全部勾选');

// 3) 组装字段
const author = oneLine(fields[FIELDS.author]) || `匿名访客（GitHub @${issueLogin}）`;
const tags = (fields[FIELDS.tags] || '')
  .split(/[,，、]/)
  .map((t) => oneLine(t, { max: 24 }))
  .filter(Boolean)
  .slice(0, 5);

let slug = toSlug(fields[FIELDS.slug]);
if (!slug) slug = `guest-${issueNumber}`;

// 4) 写文件
//    同名文件的三种情况：
//      a) 不存在                       → 直接写
//      b) 存在且来自同一个 Issue       → 覆盖（项目组改了标签重发 / 作者改了内容）
//      c) 存在但来自别的 Issue         → 加编号后缀，绝不覆盖别人的文章
const root = process.cwd();
const dir = path.join(root, 'src', 'content', 'notes');
fs.mkdirSync(dir, { recursive: true });

let file = path.join(dir, `${slug}.md`);
if (fs.existsSync(file)) {
  const existing = fs.readFileSync(file, 'utf8');
  const fromSameIssue = existing.includes(`issue: "${issueNumber}"`);
  if (fromSameIssue) {
    console.log(`ℹ️  同一投稿的已有文件，将覆盖更新：${slug}.md`);
  } else {
    slug = `${slug}-${issueNumber}`;
    file = path.join(dir, `${slug}.md`);
    console.log(`ℹ️  短名已被占用，改用：${slug}.md`);
  }
}
if (fs.existsSync(file)) {
  const existing = fs.readFileSync(file, 'utf8');
  if (!existing.includes(`issue: "${issueNumber}"`)) {
    die(`目标文件已存在且属于别的投稿：${path.basename(file)}`);
  }
}

// 用 UTC+8 的日期，和项目组的作息一致
const date = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

const frontmatter = [
  '---',
  `title: "${title}"`,
  `description: "${summary}"`,
  `date: ${date}`,
  `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
  'draft: false',
  `author: "${author}"`,
  'source: "guest"',
  `issue: "${issueNumber}"`,
  '---',
  '',
].join('\n');

fs.writeFileSync(file, frontmatter + content + '\n', 'utf8');

const rel = path.relative(root, file).split(path.sep).join('/');
console.log(`✅ 已生成：${rel}`);
console.log(`   标题：${title}`);
console.log(`   署名：${author}`);
console.log(`   标签：${tags.join(' / ') || '（无）'}`);
console.log(`   网址：https://weegoto.top/notes/${slug}`);

// 5) 把结果交给工作流
const outFile = process.env.GITHUB_OUTPUT;
if (outFile) {
  fs.appendFileSync(outFile, `file=${rel}\nslug=${slug}\ntitle=${title}\n`);
}
