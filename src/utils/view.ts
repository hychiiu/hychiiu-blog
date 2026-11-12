/**
 * 视图层共用的小函数：列表分组、语言标记、编号、社交链接。
 */
import { social, type Lang } from '../config';
import { useT, localizePath } from '../i18n';

/** 按年份分组（保持输入顺序，输入通常已按日期倒序） */
export function groupByYear<T extends { data: { date: Date } }>(items: T[]): Map<number, T[]> {
  const byYear = new Map<number, T[]>();
  for (const it of items) {
    const y = it.data.date.getFullYear();
    byYear.set(y, [...(byYear.get(y) ?? []), it]);
  }
  return byYear;
}

/** 内容语言与页面语言不同时返回小标记文案（如「中文」/「EN」），相同时返回 undefined */
export function langMarker(pageLang: Lang) {
  const t = useT(pageLang);
  return (contentLang: Lang) =>
    contentLang !== pageLang ? (contentLang === 'zh' ? t('marker.zh') : t('marker.en')) : undefined;
}

/** 两位编号：0 → '00' */
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** 站点社交链接；RSS 指向当前语言的订阅地址 */
export function socialLinks(lang: Lang) {
  return social.map((s) => (s.icon === 'rss' ? { ...s, href: localizePath(lang, '/rss.xml') } : s));
}

/**
 * 指向站内非页面资源（RSS、站点地图等）的链接属性：不走 ClientRouter、不预取，直接由浏览器打开。
 * 页面链接返回空对象（照常走 ClientRouter 的无刷新跳转与预取）。
 */
export function fileLinkAttrs(href: string): Record<string, string> {
  return /\.(xml|txt|json)$/i.test(href.split(/[?#]/)[0])
    ? { 'data-astro-reload': '', 'data-astro-prefetch': 'false' }
    : {};
}
