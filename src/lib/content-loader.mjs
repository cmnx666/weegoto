import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { parse } = createRequire(import.meta.url)('yaml');

export function splitFrontmatter(raw) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data = parse(match[1], { uniqueKeys: true }) ?? {};
  if (typeof data !== 'object' || Array.isArray(data)) throw new Error('文章元信息必须是对象');
  return { data, body: raw.slice(match[0].length) };
}

/** @param {string} folder @returns {import('astro/loaders').Loader} */
export function markdownLoader(folder) {
  return {
    name: `local-markdown-${folder}`,
    async load({ config, logger, watcher, parseData, store, generateDigest }) {
      const root = fileURLToPath(config.root);
      const dir = path.join(root, 'src', 'content', folder);
      const idOf = file => path.relative(dir, file).split(path.sep).join('/').replace(/\.md$/, '');
      const inside = file => {
        const rel = path.relative(dir, file);
        return rel !== '' && !rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel) && rel.endsWith('.md');
      };
      async function syncFile(file) {
        const id = idOf(file);
        const rel = path.relative(root, file).split(path.sep).join('/');
        const raw = fs.readFileSync(file, 'utf8');
        const { data, body } = splitFrontmatter(raw);
        const parsed = await parseData({ id, data, filePath: rel });
        store.set({ id, data: parsed, body, filePath: rel, digest: generateDigest(raw), deferredRender: true });
      }
      const files = [];
      function walk(dir) {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const file = path.join(dir, item.name);
          if (item.isDirectory()) walk(file);
          else if (item.isFile() && file.endsWith('.md')) files.push(file);
        }
      }
      if (fs.existsSync(dir)) walk(dir);
      else logger.warn(`内容目录不存在：${folder}`);
      const ids = new Set(files.map(idOf));
      for (const key of store.keys()) if (!ids.has(key)) store.delete(key);
      for (const file of files.sort()) await syncFile(file);
      if (watcher) {
        let queue = Promise.resolve();
        const update = file => {
          if (!inside(file)) return;
          queue = queue.then(() => syncFile(file)).catch(error => logger.error(String(error)));
        };
        watcher.add(dir);
        watcher.on('add', update);
        watcher.on('change', update);
        watcher.on('unlink', file => {
          if (!inside(file)) return;
          queue = queue.then(() => { store.delete(idOf(file)); });
        });
      }
    },
  };
}
