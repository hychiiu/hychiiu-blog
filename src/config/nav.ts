/**
 * 站点导航（Dock）。顺序即显示顺序；文案键为 `nav.{key}`（见 src/i18n），图标名见 components/Icon.astro。
 * onlyIfArchived：有归档内容（closed issue）时才显示。
 * also：同样让该项处于激活态的其它路径前缀（如标签页属于「文章」）。
 */
import { taxonomy } from './content.ts';

export interface NavItem {
  key: 'home' | 'posts' | 'notes' | 'about' | 'archive';
  /** 不带语言前缀的路径 */
  path: string;
  icon: string;
  onlyIfArchived?: boolean;
  also?: string[];
}

export const nav: NavItem[] = [
  { key: 'home', path: '/', icon: 'home' },
  { key: 'posts', path: '/posts/', icon: 'posts', also: [taxonomy.base] },
  { key: 'notes', path: '/notes/', icon: 'notes' },
  { key: 'about', path: '/about/', icon: 'about' },
  { key: 'archive', path: '/archive/', icon: 'archive', onlyIfArchived: true },
];

/** 当前路径（已去掉语言前缀）是否属于某导航项 */
export const isNavActive = (itemPath: string, path: string) =>
  itemPath === '/' ? path === '/' : path.startsWith(itemPath.replace(/\/$/, ''));

/** 让某导航项激活的全部路径前缀（Dock 以空格分隔写进 data-paths，浏览器端同样据此判断） */
export const navPaths = (item: NavItem) => [item.path, ...(item.also ?? [])];
