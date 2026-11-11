/** 界面文案字典（zh.ts / en.ts）+ 语言工具。内容类文案在 src/config/site.ts。 */
import { site, htmlLang, langs, type Lang } from '../config';
import { stripLang } from '../utils/path';
import zh from './zh';
import en from './en';

export { htmlLang };

export const ui = { zh, en } as const;

type Dict = (typeof ui)['zh'];
export function useT(lang: Lang) {
  return <K extends keyof Dict>(key: K): Dict[K] => (ui[lang] as unknown as Dict)[key] ?? ui.zh[key];
}

export function toLang(locale: string | undefined): Lang {
  return (langs as readonly string[]).includes(locale ?? '') ? (locale as Lang) : site.defaultLang;
}

/** 给路径加上语言前缀：('en','/posts/') -> '/en/posts/' */
export function localizePath(lang: Lang, path: string): string {
  const clean = stripLang(path);
  if (lang === site.defaultLang) return clean;
  return `/${lang}${clean === '/' ? '/' : clean}`;
}

/** 去掉语言前缀：'/en/posts/' -> '/posts/'（实现见 utils/path，浏览器端脚本也在用） */
export { stripLang };

export function quoteMarks(lang: Lang, s: string) {
  return lang === 'zh' ? `「${s}」` : `“${s}”`;
}
