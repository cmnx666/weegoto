// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 站点域名（已配置好）。以后换域名只改这一行，然后重新 push 触发构建。
export const SITE_URL = 'https://weegoto.top';

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  security: {
    csp: {
      directives: ["base-uri 'self'", "object-src 'none'", "form-action https://github.com"],
      styleDirective: { resources: [{ resource: "'self'", kind: 'element' }, { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
  markdown: {
    // V2 是深色主题，代码块必须用深色高亮，否则会出现刺眼的白块
    shikiConfig: { theme: 'github-dark', wrap: true },
  },
});
