// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 站点域名（已配置好）。以后换域名只改这一行，然后重新 push 触发构建。
export const SITE_URL = 'https://weegoto.top';

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
  },
});
