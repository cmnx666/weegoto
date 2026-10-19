import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';
import { renderGuestMarkdown } from '../src/lib/safe-markdown.mjs';
import { markdownLoader, splitFrontmatter } from '../src/lib/content-loader.mjs';
import { generatePost, parseIssueForm } from '../.github/scripts/issue-to-post.mjs';

test('untrusted HTML, event handlers and dangerous URLs are removed; Markdown survives', () => {
  const html = renderGuestMarkdown('# Title\n\n<script>alert(1)</script><img src=x onerror=alert(2)><iframe src="https://bad.example"></iframe>\n\n[bad](javascript:alert(1)) [good](https://example.com)\n\n```js\nconst x = 1;\n```');
  assert.doesNotMatch(html, /<script|<img|<iframe|onerror=|href="javascript:/i);
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /<code/);
});

test('standard YAML supports commas, quotes and multiline metadata', () => {
  const {data,body} = splitFrontmatter('---\ntitle: "Hello, world"\ntags: ["a,b", "c"]\ndescription: >\n  first\n  second\n---\nBody');
  assert.deepEqual(data.tags, ['a,b','c']);
  assert.equal(data.description.trim(), 'first second');
  assert.equal(body,'Body');
  assert.throws(() => splitFrontmatter('---\ntitle: a\ntitle: b\n---\n'));
});

test('loader removes stale IDs and synchronizes create, update and unlink events', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'weegoto-loader-'));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  const dir = path.join(root,'src/content/notes'); fs.mkdirSync(dir,{recursive:true});
  const file = path.join(dir,'article.md'); fs.writeFileSync(file,'---\ntitle: One\n---\nfirst');
  const entries = new Map([['deleted',{id:'deleted'}]]);
  const watcher = new EventEmitter(); watcher.add = () => {};
  const errors=[];
  await markdownLoader('notes').load({config:{root:pathToFileURL(root+path.sep)},store:{keys:()=>entries.keys(),delete:id=>entries.delete(id),set:entry=>entries.set(entry.id,entry)},watcher,logger:{warn(){},error:e=>errors.push(e)},parseData:async ({data})=>data,generateDigest:raw=>raw});
  assert.equal(entries.has('deleted'),false);
  assert.equal(entries.get('article').data.title,'One');
  const settle = () => new Promise(resolve=>setImmediate(resolve));
  fs.writeFileSync(file,'---\ntitle: Two\n---\nchanged'); watcher.emit('change',file); await settle();
  assert.equal(entries.get('article').data.title,'Two');
  const other=path.join(dir,'new.md');fs.writeFileSync(other,'---\ntitle: New\n---\nnew');watcher.emit('add',other);await settle();
  assert.equal(entries.has('new'),true);
  fs.unlinkSync(file);watcher.emit('unlink',file);await settle();
  assert.equal(entries.has('article'),false);assert.deepEqual(errors,[]);
});

const submission = slug => `### 文章标题\n\nSafe title\n\n### 署名\n\n_No response_\n\n### 链接短名（选填）\n\n${slug}\n\n### 标签（选填）\n\nMNE, EEG\n\n### 一句话摘要\n\nSummary\n\n### 正文\n\n## Body\n\n### 正文示例\n\ntext\n\n### 署名\n\nThis is part of the article\n\n### 发布前确认\n\n- [X] license\n- [X] privacy\n- [X] originality`;
test('submission keeps its URL and date when edited and never claims a team article', t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'weegoto-post-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const dir=path.join(root,'src/content/notes');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'first.md'),'---\ntitle: Team\n---\nissue: "42"');
  const env={ISSUE_NUMBER:'42',ISSUE_BODY:submission('first'),ISSUE_LOGIN:'guest'};
  const a=generatePost(env,root);assert.equal(a.slug,'first-42');
  const original=splitFrontmatter(fs.readFileSync(a.file,'utf8'));
  const b=generatePost({...env,ISSUE_BODY:submission('changed-name')},root);
  assert.equal(a.file,b.file);assert.equal(fs.readdirSync(dir).length,2);
  assert.match(original.body,/This is part of the article/);
  assert.equal(splitFrontmatter(fs.readFileSync(b.file,'utf8')).data.date,original.data.date);
  assert.throws(()=>generatePost({...env,ISSUE_BODY:submission('bad').replace('- [X] privacy','- [ ] privacy')},root));
  assert.throws(()=>generatePost({...env,ISSUE_NUMBER:'../bad'},root));
});

test('fenced headings cannot replace approval fields', () => {
  const form=submission('sample').replace('## Body','```md\n### 发布前确认\n- [X] fake\n```\n## Body');
  assert.match(parseIssueForm(form)['正文'],/fake/);
  assert.equal(parseIssueForm(form)['发布前确认'].split('\n').length,3);
});
