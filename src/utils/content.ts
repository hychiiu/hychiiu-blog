import { getCollection, type CollectionEntry } from 'astro:content';
import { content, type Lang } from '../config';

const isProd = import.meta.env.PROD;

export async function getPosts() {
  const all = await getCollection('posts', ({ data }) => !(isProd && data.draft));
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getNotes() {
  const all = await getCollection('notes', ({ data }) => !(isProd && data.draft));
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 中文按字计数，英文按词计数 */
export function countWords(text = ''): number {
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[#>*_`~\-[\]()!|]/g, ' ');
  const cjk = clean.match(/[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
  const latin =
    clean
      .replace(/[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g, ' ')
      .match(/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g)?.length ?? 0;
  return cjk + latin;
}

export function readingMinutes(text = ''): number {
  return Math.max(1, Math.round(countWords(text) / content.wordsPerMinute));
}

/** 点分日期：2026·11·11 */
export function dotDate(d: Date): string {
  return `${d.getFullYear()}·${String(d.getMonth() + 1).padStart(2, '0')}·${String(d.getDate()).padStart(2, '0')}`;
}

export type Post = CollectionEntry<'posts'>;
export type Note = CollectionEntry<'notes'>;

/**
 * 某语言站点要展示的条目：
 * - zh：全部条目（英文条目带 English 标记）
 * - en：英文条目；若一篇都没有，则回退展示中文条目（带 Chinese 标记）
 */
function forLang<T extends { data: { lang: Lang } }>(all: T[], lang: Lang): T[] {
  if (lang === 'zh') return all;
  const own = all.filter((e) => e.data.lang === lang);
  return own.length ? own : all;
}

type Scope = 'published' | 'archived' | 'all';
const inScope = (scope: Scope) => (e: { data: { archived: boolean } }) =>
  scope === 'all' ? true : scope === 'archived' ? e.data.archived : !e.data.archived;

/** scope：published = 未归档（open issue，默认）；archived = 已归档（closed issue）；all = 全部（用于生成详情页） */
export async function getPostsFor(lang: Lang, scope: Scope = 'published') {
  return forLang(await getPosts(), lang).filter(inScope(scope));
}

export async function getNotesFor(lang: Lang, scope: Scope = 'published') {
  return forLang(await getNotes(), lang).filter(inScope(scope));
}
