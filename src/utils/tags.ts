/**
 * 标签（= 分类）：从文章与手记的 tags 汇总，生成标签页与筛选行的数据。
 * 规则见 config/content.ts 的 taxonomy。
 */
import { taxonomy, type Lang } from '../config';
import { localizePath } from '../i18n';
import { getPostsFor, getNotesFor, type Post, type Note } from './content';

export type TaggedEntry = (Post | Note) & { kind: 'posts' | 'notes' };

export interface Tag {
  /** 显示名（首次出现时的写法） */
  name: string;
  /** URL 段：小写，空白与 URL 保留字符换成 - */
  slug: string;
  /** 按日期倒序 */
  entries: TaggedEntry[];
}

export const tagSlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[\s/\\?#%&+]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** 某语言下某标签页的路径 */
export const tagHref = (lang: Lang, slug: string) => localizePath(lang, `${taxonomy.base}${slug}/`);

/** 标签索引页的路径 */
export const tagsIndexHref = (lang: Lang) => localizePath(lang, taxonomy.base);

/** 某语言站点的全部标签（只算未归档条目），按篇数倒序、同数按名称排序 */
export async function getTagsFor(lang: Lang): Promise<Tag[]> {
  const [posts, notes] = await Promise.all([getPostsFor(lang), getNotesFor(lang)]);
  const entries: TaggedEntry[] = [
    ...posts.map((e) => ({ ...e, kind: 'posts' as const })),
    ...notes.map((e) => ({ ...e, kind: 'notes' as const })),
  ].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const map = new Map<string, Tag>();
  for (const e of entries) {
    for (const name of new Set(e.data.tags)) {
      const slug = tagSlug(name);
      if (!slug) continue;
      const tag = map.get(slug) ?? { name, slug, entries: [] };
      if (!tag.entries.includes(e)) tag.entries.push(e);
      map.set(slug, tag);
    }
  }
  return [...map.values()].sort(
    (a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name, 'zh-Hans-CN'),
  );
}
