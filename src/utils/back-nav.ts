import { taxonomy } from '../config/content.ts';
import { defaultLang, type Lang } from '../config/locales.ts';
import { stripLang } from './path.ts';

/** 与 i18n.localizePath 相同：给路径加上语言前缀。这里直连具体文件，便于 Node 测试加载。 */
function localizePath(lang: Lang, path: string): string {
  const clean = stripLang(path);
  if (lang === defaultLang) return clean;
  return `/${lang}${clean === '/' ? '/' : clean}`;
}

/** 进入文章前的来源菜单（路径、筛选与滚动） */
export interface BackSource {
  pathname: string;
  search?: string;
  hash?: string;
  scrollY?: number;
  filterScrollLeft?: number;
}

export interface BackNavState {
  source: BackSource | null;
  switchedLang: boolean;
}

export interface BackTarget {
  useHistoryBack: boolean;
  href: string;
  scrollY?: number;
  filterScrollLeft?: number;
}

/** 统一成带尾斜杠的路径，便于比较与加语言前缀 */
function cleanPath(pathname: string): string {
  const p = pathname.split('?')[0].split('#')[0] || '/';
  if (!p.startsWith('/')) return '/';
  return p === '/' ? '/' : p.endsWith('/') ? p : `${p}/`;
}

function pathLang(pathname: string): Lang {
  return /^\/en(?=\/|$)/.test(cleanPath(pathname)) ? 'en' : 'zh';
}

/** 文章 / 手记详情页（列表本身不算） */
export function isArticlePath(pathname: string): boolean {
  return /^\/(posts|notes)\/./.test(stripLang(cleanPath(pathname)));
}

/** 可记为「指定菜单」的来源：首页、文章/手记列表、标签、归档 */
export function isSourceMenuPath(pathname: string): boolean {
  const p = stripLang(cleanPath(pathname));
  return (
    p === '/' ||
    p === '/posts/' ||
    p === '/notes/' ||
    p === '/archive/' ||
    p === taxonomy.base ||
    p.startsWith(taxonomy.base)
  );
}

/** 同一篇在中英文之间切换（不是换一篇，也不是去列表） */
export function isLangSwitchOfSameArticle(fromPath: string, toPath: string): boolean {
  if (!isArticlePath(fromPath) || !isArticlePath(toPath)) return false;
  if (stripLang(cleanPath(fromPath)) !== stripLang(cleanPath(toPath))) return false;
  return pathLang(fromPath) !== pathLang(toPath);
}

/** 把记下来的来源菜单改写到目标语言，并保留查询与 hash */
export function localizeSourceHref(source: BackSource, lang: Lang): string {
  return `${localizePath(lang, cleanPath(source.pathname))}${source.search ?? ''}${source.hash ?? ''}`;
}

/** 根据一次站内跳转更新「来源菜单 / 是否已切换语言」 */
export function rememberSourceOnNav(state: BackNavState, from: BackSource, toPathname: string): BackNavState {
  if (isLangSwitchOfSameArticle(from.pathname, toPathname)) {
    return { source: state.source, switchedLang: true };
  }
  if (isArticlePath(toPathname) && isSourceMenuPath(from.pathname)) {
    return {
      source: {
        pathname: cleanPath(from.pathname),
        search: from.search ?? '',
        hash: from.hash ?? '',
        scrollY: from.scrollY,
        filterScrollLeft: from.filterScrollLeft,
      },
      switchedLang: false,
    };
  }
  if (isArticlePath(toPathname) && isArticlePath(from.pathname)) {
    return { source: state.source, switchedLang: false };
  }
  return { source: null, switchedLang: false };
}

/**
 * 决定文章页「返回」去哪里。
 * 未切换语言的站内进入仍用 history.back() 恢复原列表滚动；
 * 一旦在同一篇上切换过语言，就回到当前语言下的来源菜单（或列表 fallback），绝不再退到另一语言的同一篇。
 */
export function resolveBackTarget(opts: {
  currentLang: Lang;
  fallbackHref: string;
  source: BackSource | null;
  canUseHistoryBack: boolean;
  switchedLang: boolean;
}): BackTarget {
  const { currentLang, fallbackHref, source, canUseHistoryBack, switchedLang } = opts;
  if (canUseHistoryBack && !switchedLang) {
    return { useHistoryBack: true, href: fallbackHref };
  }
  if (source && isSourceMenuPath(source.pathname)) {
    return {
      useHistoryBack: false,
      href: localizeSourceHref(source, currentLang),
      scrollY: source.scrollY,
      filterScrollLeft: source.filterScrollLeft,
    };
  }
  return { useHistoryBack: false, href: fallbackHref };
}
