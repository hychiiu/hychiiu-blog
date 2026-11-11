import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '../site.config';
import { getPosts, getNotes } from '../utils/content';

export async function GET(context: APIContext) {
  const [posts, notes] = await Promise.all([getPosts(), getNotes()]);
  const items = [
    ...posts.map((p) => ({ title: p.data.title, pubDate: p.data.date, description: p.data.description, link: `/posts/${p.id}/`, categories: p.data.tags })),
    ...notes.map((n) => ({ title: `手记 · ${n.data.title}`, pubDate: n.data.date, link: `/notes/${n.id}/` })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    items,
    customData: `<language>${site.lang}</language>`,
  });
}
