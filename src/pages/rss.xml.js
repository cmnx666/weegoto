import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE, SECTION_KEYS } from '../consts';

export async function GET(context) {
  const grouped = await Promise.all(
    SECTION_KEYS.map(async (k) => {
      const posts = await getCollection(k, ({ data }) => !data.draft);
      return posts.map((entry) => ({
        title: entry.data.title,
        description: entry.data.description,
        pubDate: entry.data.date,
        link: `/${k}/${entry.id}/`,
        categories: entry.data.tags,
      }));
    })
  );

  const items = grouped.flat().sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items,
    customData: '<language>zh-cn</language>',
  });
}
