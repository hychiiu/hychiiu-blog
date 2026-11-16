import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site, type Lang } from '../config';
import { htmlLang, localizePath, useT } from '../i18n';
import { getPostsFor, getNotesFor } from './content';
import { entryPath } from './entry-lang';

export async function feed(context: APIContext, lang: Lang) {
  const t = useT(lang);
  const [posts, notes] = await Promise.all([getPostsFor(lang), getNotesFor(lang)]);
  const items = [
    ...posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: localizePath(lang, entryPath('posts', p)),
      categories: p.data.tags,
    })),
    ...notes.map((n) => ({
      title: `${t('kind.note')} · ${n.data.title}`,
      pubDate: n.data.date,
      link: localizePath(lang, entryPath('notes', n)),
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: lang === site.defaultLang ? site.title : `${site.title} (${lang.toUpperCase()})`,
    description: site.description[lang],
    site: context.site ?? site.url,
    items,
    customData: `<language>${htmlLang[lang]}</language>`,
  });
}
