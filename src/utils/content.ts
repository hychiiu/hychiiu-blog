import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../site.config';

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

export async function getStats() {
  const [posts, notes] = await Promise.all([getPosts(), getNotes()]);
  const words = [...posts, ...notes].reduce((s, e) => s + countWords(e.body ?? ''), 0);
  return { posts: posts.length, notes: notes.length, words, days: daysSince(site.startDate) };
}
