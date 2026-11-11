/** 语言：站点支持的语言、默认语言（根路径 /，其余语言带 /{lang}/ 前缀）与各种场合的语言代码 */
export const langs = ['zh', 'en'] as const;
export type Lang = (typeof langs)[number];
export type Localized<T = string> = Record<Lang, T>;

export const defaultLang: Lang = 'zh';

export const locales = {
  zh: { html: 'zh-CN', og: 'zh_CN', short: '中' },
  en: { html: 'en', og: 'en_US', short: 'EN' },
} as const satisfies Record<Lang, { html: string; og: string; short: string }>;

/** <html lang> / hreflang 用的语言代码 */
export const htmlLang = Object.fromEntries(langs.map((l) => [l, locales[l].html])) as Record<Lang, string>;

/** 另一种语言（目前只有两种） */
export const otherLang = (l: Lang): Lang => (l === 'zh' ? 'en' : 'zh');
