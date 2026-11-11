import { getCollection, type CollectionEntry } from 'astro:content';
import { site, type Lang } from '../site.config';

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
    .replace(/[#>*_`~\-\[\]()!|]/g, ' ');
  const cjk = clean.match(/[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
  const latin = clean.replace(/[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g, ' ').match(/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g)?.length ?? 0;
  return cjk + latin;
}

export function readingMinutes(text = ''): number {
  return Math.max(1, Math.round(countWords(text) / 400));
}

export function daysSince(date: string | Date): number {
  const start = new Date(date).getTime();
  return Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1);
}

export function formatDate(d: Date, style: 'long' | 'short' = 'long'): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (style === 'short') return `${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  return `${y} 年 ${m} 月 ${day} 日`;
}

/** Yohaku 风格的点分日期：2026·11·11 */
export function dotDate(d: Date): string {
  return `${d.getFullYear()}·${String(d.getMonth() + 1).padStart(2, '0')}·${String(d.getDate()).padStart(2, '0')}`;
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
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

export async function getPostsFor(lang: Lang) {
  return forLang(await getPosts(), lang);
}

export async function getNotesFor(lang: Lang) {
  return forLang(await getNotes(), lang);
}

export async function getStats(lang: Lang = 'zh') {
  const [posts, notes] = await Promise.all([getPostsFor(lang), getNotesFor(lang)]);
  const words = [...posts, ...notes].reduce((s, e) => s + countWords(e.body ?? ''), 0);
  return { posts: posts.length, notes: notes.length, words, days: daysSince(site.startDate) };
}
