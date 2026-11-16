import type { CollectionEntry } from 'astro:content';
import type { Lang } from '../config';
import { localizePath } from '../i18n';
import { getPostsFor, getNotesFor } from './content';
import { entryPath, entrySlug } from './entry-lang';

type Kind = 'posts' | 'notes';

/** 生成某语言下文章 / 手记详情页的静态路径，并计算另一语言的等价页面 */
export async function entryPaths<K extends Kind>(kind: K, lang: Lang) {
  const get = (kind === 'posts' ? getPostsFor : getNotesFor) as (
    l: Lang,
    scope: 'all',
  ) => Promise<CollectionEntry<K>[]>;
  const [list, zhList, enList] = await Promise.all([get(lang, 'all'), get('zh', 'all'), get('en', 'all')]);
  const has = { zh: new Set(zhList.map(entrySlug)), en: new Set(enList.map(entrySlug)) };
  const href = (entry: (typeof list)[number]) => localizePath(lang, entryPath(kind, entry));
  return list.map((entry, i) => {
    const slug = entrySlug(entry);
    return {
      params: { id: slug },
      props: {
        entry,
        lang,
        newer: list[i - 1] ? { href: href(list[i - 1]), title: list[i - 1].data.title } : undefined,
        older: list[i + 1] ? { href: href(list[i + 1]), title: list[i + 1].data.title } : undefined,
        alternates: {
          zh: has.zh.has(slug) ? localizePath('zh', `/${kind}/${slug}/`) : localizePath('zh', `/${kind}/`),
          en: has.en.has(slug) ? localizePath('en', `/${kind}/${slug}/`) : localizePath('en', `/${kind}/`),
        },
      },
    };
  });
}
