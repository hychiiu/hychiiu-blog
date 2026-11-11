import type { CollectionEntry } from 'astro:content';
import type { Lang } from '../site.config';
import { localizePath } from '../i18n';
import { getPostsFor, getNotesFor } from './content';

type Kind = 'posts' | 'notes';

/** 生成某语言下文章 / 手记详情页的静态路径，并计算另一语言的等价页面 */
export async function entryPaths<K extends Kind>(kind: K, lang: Lang) {
  const get = (kind === 'posts' ? getPostsFor : getNotesFor) as (
    l: Lang,
    scope: 'all',
  ) => Promise<CollectionEntry<K>[]>;
  const [list, zhList, enList] = await Promise.all([get(lang, 'all'), get('zh', 'all'), get('en', 'all')]);
  const has = { zh: new Set(zhList.map((e) => e.id)), en: new Set(enList.map((e) => e.id)) };
  const href = (id: string) => localizePath(lang, `/${kind}/${id}/`);
  return list.map((entry, i) => ({
    params: { id: entry.id },
    props: {
      entry,
      lang,
      newer: list[i - 1] ? { href: href(list[i - 1].id), title: list[i - 1].data.title } : undefined,
      older: list[i + 1] ? { href: href(list[i + 1].id), title: list[i + 1].data.title } : undefined,
      alternates: {
        zh: has.zh.has(entry.id) ? localizePath('zh', `/${kind}/${entry.id}/`) : localizePath('zh', `/${kind}/`),
        en: has.en.has(entry.id) ? localizePath('en', `/${kind}/${entry.id}/`) : localizePath('en', `/${kind}/`),
      },
    },
  }));
}
