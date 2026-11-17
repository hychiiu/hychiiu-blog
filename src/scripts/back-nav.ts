/**
 * 文章页「返回」：记住进入文章前的来源菜单，语言切换后回到当前语言的该菜单，
 * 而不是 history.back() 到同一篇的另一语言。未切换语言时仍用 history.back() 恢复滚动。
 * 本脚本挂在 Dock 上，保证从列表进入文章时已经在记录来源。
 */
import { once } from './runtime.ts';
import {
  isArticlePath,
  isLangSwitchOfSameArticle,
  isSourceMenuPath,
  rememberSourceOnNav,
  resolveBackTarget,
  type BackNavState,
  type BackSource,
} from '../utils/back-nav.ts';

export const BACK_NAV_STATE_KEY = 'yh-article-back';
export const BACK_NAV_RESTORE_KEY = 'yh-article-back-restore';
const FALLBACK_ATTR = 'data-back-fallback';

/** 可注入的浏览器环境，便于模拟 ClientRouter 的事件顺序做集成测试 */
export type BackNavHost = {
  document: {
    documentElement: { dataset: { lang?: string } };
    referrer: string;
    addEventListener: (type: string, fn: (e: Event) => void, opts?: boolean | AddEventListenerOptions) => void;
    querySelector: (sel: string) => { scrollLeft?: number } | HTMLAnchorElement | Element | null;
  };
  location: { pathname: string; origin: string };
  history: { length: number; back: () => void };
  sessionStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  window: { __yhInternalNav?: boolean; scrollY: number; scrollTo: (opts: ScrollToOptions) => void };
};

export function bindBackNav(host: BackNavHost): void {
  const { document, location, history, sessionStorage, window } = host;

  let state: BackNavState = { source: null, switchedLang: false };
  let pendingRestore: { scrollY?: number; filterScrollLeft?: number } | null = null;

  const currentLang = (): 'zh' | 'en' => (document.documentElement.dataset.lang === 'en' ? 'en' : 'zh');

  const readState = (): BackNavState => {
    try {
      const raw = sessionStorage.getItem(BACK_NAV_STATE_KEY);
      if (!raw) return { source: null, switchedLang: false };
      const data = JSON.parse(raw) as BackNavState;
      return { source: data.source ?? null, switchedLang: !!data.switchedLang };
    } catch {
      return { source: null, switchedLang: false };
    }
  };

  const writeState = (next: BackNavState) => {
    state = next;
    try {
      sessionStorage.setItem(BACK_NAV_STATE_KEY, JSON.stringify(next));
    } catch {}
  };

  const snapshot = (url: URL, live: boolean): BackSource => {
    const filter = live ? (document.querySelector('[data-tag-filter]') as { scrollLeft?: number } | null) : null;
    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      scrollY: live ? window.scrollY : undefined,
      filterScrollLeft: live ? (filter?.scrollLeft ?? 0) : undefined,
    };
  };

  const fallbackHref = (back: HTMLAnchorElement): string => {
    let href = back.getAttribute(FALLBACK_ATTR);
    if (!href) {
      href = back.getAttribute('href') || '/';
      back.setAttribute(FALLBACK_ATTR, href);
    }
    return href;
  };

  const syncBackLink = () => {
    const back = document.querySelector('[data-back]') as HTMLAnchorElement | null;
    if (!back) return;
    const target = resolveBackTarget({
      currentLang: currentLang(),
      fallbackHref: fallbackHref(back),
      source: state.source,
      canUseHistoryBack: false,
      switchedLang: state.switchedLang,
    });
    back.setAttribute('href', target.href);
  };

  const applyRestore = (restore: { scrollY?: number; filterScrollLeft?: number } | null) => {
    if (!restore) return;
    if (restore.scrollY != null) window.scrollTo({ top: restore.scrollY, left: 0, behavior: 'instant' });
    const filter = document.querySelector('[data-tag-filter]') as { scrollLeft?: number } | null;
    if (filter && restore.filterScrollLeft != null) filter.scrollLeft = restore.filterScrollLeft;
  };

  const takePendingRestore = () => {
    let restore = pendingRestore;
    pendingRestore = null;
    if (!restore) {
      try {
        const raw = sessionStorage.getItem(BACK_NAV_RESTORE_KEY);
        if (raw) restore = JSON.parse(raw) as { scrollY?: number; filterScrollLeft?: number };
        sessionStorage.removeItem(BACK_NAV_RESTORE_KEY);
      } catch {
        restore = null;
      }
    } else {
      try {
        sessionStorage.removeItem(BACK_NAV_RESTORE_KEY);
      } catch {}
    }
    applyRestore(restore);
  };

  const bootFromReferrer = () => {
    if (!isArticlePath(location.pathname) || !document.referrer) return;
    try {
      const ref = new URL(document.referrer);
      if (ref.origin !== location.origin) return;
      if (isLangSwitchOfSameArticle(ref.pathname, location.pathname)) {
        writeState(rememberSourceOnNav(state, snapshot(ref, false), location.pathname));
      } else if (!state.source && isSourceMenuPath(ref.pathname)) {
        writeState(rememberSourceOnNav(state, snapshot(ref, false), location.pathname));
      }
    } catch {}
  };

  state = readState();
  if (!isArticlePath(location.pathname)) {
    writeState({ source: null, switchedLang: false });
  } else if (!window.__yhInternalNav) {
    bootFromReferrer();
  }

  document.addEventListener('astro:before-preparation', (e) => {
    const ev = e as Event & { from: URL; to: URL };
    writeState(rememberSourceOnNav(state, snapshot(ev.from, true), ev.to.pathname));
  });

  document.addEventListener('astro:after-swap', () => {
    syncBackLink();
    takePendingRestore();
  });
  document.addEventListener('astro:page-load', () => {
    syncBackLink();
    takePendingRestore();
  });
  syncBackLink();
  takePendingRestore();

  // 捕获阶段：先于 ClientRouter 的冒泡 click（它会 preventDefault 并同步派发
  // astro:before-preparation，文章→菜单会清空 source / switchedLang）。
  document.addEventListener(
    'click',
    (e) => {
      const ev = e as MouseEvent;
      const back = (ev.target as Element | null)?.closest?.('[data-back]') as HTMLAnchorElement | null;
      if (!back || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
      let sameOrigin = false;
      try {
        sameOrigin = !!document.referrer && new URL(document.referrer).origin === location.origin;
      } catch {}
      const canUseHistoryBack = !!(window.__yhInternalNav || sameOrigin) && history.length > 1;
      const target = resolveBackTarget({
        currentLang: currentLang(),
        fallbackHref: fallbackHref(back),
        source: state.source,
        canUseHistoryBack,
        switchedLang: state.switchedLang,
      });
      back.setAttribute('href', target.href);
      if (target.useHistoryBack) {
        ev.preventDefault();
        history.back();
        return;
      }
      if (target.scrollY != null || target.filterScrollLeft != null) {
        pendingRestore = { scrollY: target.scrollY, filterScrollLeft: target.filterScrollLeft };
        try {
          sessionStorage.setItem(BACK_NAV_RESTORE_KEY, JSON.stringify(pendingRestore));
        } catch {}
      }
    },
    { capture: true },
  );
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && once('back-nav')) {
  bindBackNav({ document, location, history, sessionStorage, window });
}
