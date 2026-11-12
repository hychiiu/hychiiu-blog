import { langs, type Lang } from '../config';
import { getTagsFor, tagHref, tagsIndexHref } from './tags';

/** 某语言下全部标签页的静态路径；另一语言没有同名标签时，语言切换回到那边的标签索引 */
export async function tagPaths(lang: Lang) {
  const byLang = Object.fromEntries(
    await Promise.all(langs.map(async (l) => [l, new Set((await getTagsFor(l)).map((x) => x.slug))] as const)),
  ) as Record<Lang, Set<string>>;
  return (await getTagsFor(lang)).map((tag) => ({
    params: { tag: tag.slug },
    props: {
      lang,
      tag,
      alternates: Object.fromEntries(
        langs.map((l) => [l, byLang[l].has(tag.slug) ? tagHref(l, tag.slug) : tagsIndexHref(l)]),
      ) as Record<Lang, string>,
    },
  }));
}
