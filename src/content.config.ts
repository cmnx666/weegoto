import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineCollection, z } from 'astro:content';

// ===========================================================================
//  为什么不用官方的 astro/loaders 的 glob()
// ===========================================================================
//  Astro 的 glob loader 在顶层 import 了 yaml 与 picomatch 这两个 CJS 包。
//  在当前环境（Astro 7 + Vite 8 + Node 22 + Windows）里，
//  Vite 的模块运行器会把它们当 ESM 求值，直接抛
//  "require is not defined"，导致 `astro sync` 失败、整个构建起不来。
//
//  官方 loader 我们改不了，但 Astro 的内容层允许自定义 loader。
//  下面这个 loader 只用 Node 内置模块 + 手写的 frontmatter 解析，
//  完全绕开 yaml 和 picomatch，行为等价、且更容易调试。
// ===========================================================================

/** 解析形如 --- ... --- 的 frontmatter（只支持本项目用到的 YAML 子集） */
function splitFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) return { data: {}, body: raw };

  const unquote = (s: string) =>
    (s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))
      ? s.slice(1, -1)
      : s;

  const data: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim();

    if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
    } else if (val === 'true' || val === 'false') {
      data[key] = val === 'true';
    } else {
      data[key] = unquote(val);
    }
  }
  return { data, body: raw.slice(m[0].length) };
}

/** 递归收集目录下所有 .md 文件 */
function collectMarkdown(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** 为一个栏目创建一个基于本地 Markdown 文件的 loader */
function markdownLoader(folder: string) {
  return {
    name: `local-markdown-${folder}`,
    load: async (ctx: any) => {
      const { config, logger, watcher, parseData, store, generateDigest } = ctx;
      const root = fileURLToPath(config.root);
      const dir = path.join(root, 'src', 'content', folder);

      if (!fs.existsSync(dir)) {
        logger.warn(`内容目录不存在，已跳过：src/content/${folder}`);
        return;
      }

      for (const file of collectMarkdown(dir)) {
        const rel = path.relative(root, file).split(path.sep).join('/');
        const id = path
          .relative(dir, file)
          .split(path.sep)
          .join('/')
          .replace(/\.md$/, '');

        const raw = fs.readFileSync(file, 'utf8');
        const { data, body } = splitFrontmatter(raw);
        const parsedData = await parseData({ id, data, filePath: rel });

        store.set({
          id,
          data: parsedData,
          body,
          // 注意：这里必须是相对项目根目录的路径。
          // 传绝对路径会让 Vite 内部的 fileURLToPath 抛
          // "The URL must be of scheme file"。
          filePath: rel,
          digest: generateDigest(raw),
          deferredRender: true,
        });
      }

      watcher?.add(dir);
    },
  };
}

const articleSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),

  // ---- 访客投稿相关（团队自撰的文章留空即可）----
  /** 投稿者署名。留空表示由项目组撰写 */
  author: z.string().optional(),
  /** 来源：team = 项目组自撰；guest = 访客投稿（经审核后发布） */
  source: z.string().default('team'),
  /** 访客投稿对应的 GitHub Issue 编号，用于追溯与讨论 */
  issue: z.string().optional(),
});

export const collections = {
  progress: defineCollection({
    loader: markdownLoader('progress'),
    schema: articleSchema,
  }),
  outlook: defineCollection({
    loader: markdownLoader('outlook'),
    schema: articleSchema,
  }),
  notes: defineCollection({
    loader: markdownLoader('notes'),
    schema: articleSchema,
  }),
};
