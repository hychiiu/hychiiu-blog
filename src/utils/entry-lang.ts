/**
 * 同一 slug、不同语言的文章配对。
 * 集合内部 id 必须唯一，所以用 `${slug}--${lang}`；对外 URL 与语言切换一律用 slug。
 */
export type Langish = 'zh' | 'en';

export const slugOk = (s?: string) => (s && /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(s) ? s : undefined);

export function entrySlug(entry: { id: string; data: { slug?: string } }): string {
  return entry.data.slug || entry.id;
}

/** 某语言下列出的条目：中文站展示中文版 + 尚无中文配对的英文；英文站有英文则只列英文，否则回退全部中文。 */
export function entriesForLang<T extends { id: string; data: { lang: Langish; slug?: string } }>(
  all: T[],
  lang: Langish,
): T[] {
  const slugOf = (e: T) => entrySlug(e);
  if (lang === 'zh') {
    const zhSlugs = new Set(all.filter((e) => e.data.lang === 'zh').map(slugOf));
    return all.filter((e) => e.data.lang === 'zh' || !zhSlugs.has(slugOf(e)));
  }
  const own = all.filter((e) => e.data.lang === lang);
  return own.length ? own : all;
}

/** 为 loader 生成唯一内部 id，以及用于 URL / 配对的 slug。同语言 slug 冲突时退回 issue 号。 */
export function issueEntryKeys(
  issue: { number: number; lang: string },
  slugRaw: string | undefined,
  used: Set<string>,
): { id: string; slug: string } {
  const wanted = slugOk(slugRaw) ?? String(issue.number);
  let slug = wanted;
  let id = `${slug}--${issue.lang}`;
  if (used.has(id)) {
    slug = String(issue.number);
    id = `${slug}--${issue.lang}`;
  }
  used.add(id);
  return { id, slug };
}

/** 站点内文章 / 手记路径（不含语言前缀），供列表、RSS、语言切换使用 */
export function entryPath(kind: 'posts' | 'notes', entry: { id: string; data: { slug?: string } }): string {
  return `/${kind}/${entrySlug(entry)}/`;
}
