/**
 * 站点导航（Dock）。顺序即显示顺序；文案键为 `nav.{key}`（见 src/i18n），图标名见 components/Icon.astro。
 * onlyIfArchived：有归档内容（closed issue）时才显示。
 */
export interface NavItem {
  key: 'home' | 'posts' | 'notes' | 'about' | 'archive';
  /** 不带语言前缀的路径 */
  path: string;
  icon: string;
  onlyIfArchived?: boolean;
}

export const nav: NavItem[] = [
  { key: 'home', path: '/', icon: 'home' },
  { key: 'posts', path: '/posts/', icon: 'posts' },
  { key: 'notes', path: '/notes/', icon: 'notes' },
  { key: 'about', path: '/about/', icon: 'about' },
  { key: 'archive', path: '/archive/', icon: 'archive', onlyIfArchived: true },
];

/** 当前路径（已去掉语言前缀）是否属于某导航项 */
export const isNavActive = (itemPath: string, path: string) =>
  itemPath === '/' ? path === '/' : path.startsWith(itemPath.replace(/\/$/, ''));
