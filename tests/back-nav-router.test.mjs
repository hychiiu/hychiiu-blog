/**
 * 模拟 Astro ClientRouter 的真实事件顺序：
 * - ClientRouter 在 Head 里先注册 document 冒泡 click，并在 handler 里调用 navigate()
 * - navigate() → doPreparation() 在第一个 await 之前同步派发 astro:before-preparation
 * 文章 → 菜单的 before-preparation 会清空 source / switchedLang；
 * 若返回处理挂在冒泡阶段、排在 Router 之后，就会误用 history.back()，popstate 再中止菜单导航。
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACK_NAV_RESTORE_KEY, BACK_NAV_STATE_KEY, bindBackNav } from '../src/scripts/back-nav.ts';

function createDispatcher() {
  const capture = new Map();
  const bubble = new Map();
  const add = (map, type, fn) => {
    if (!map.has(type)) map.set(type, []);
    map.get(type).push(fn);
  };
  return {
    addEventListener(type, fn, opts) {
      const cap = opts === true || (opts && opts.capture === true);
      add(cap ? capture : bubble, type, fn);
    },
    dispatchEvent(ev) {
      if (typeof ev.defaultPrevented !== 'boolean') ev.defaultPrevented = false;
      if (!ev.preventDefault)
        ev.preventDefault = () => {
          ev.defaultPrevented = true;
        };
      for (const fn of capture.get(ev.type) || []) fn(ev);
      for (const fn of bubble.get(ev.type) || []) fn(ev);
      return !ev.defaultPrevented;
    },
  };
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

function makeBackLink(href) {
  const attrs = { href, 'data-back': '' };
  const back = {
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    setAttribute: (name, value) => {
      attrs[name] = value;
    },
    closest(sel) {
      if (sel === '[data-back]' || sel === 'a' || sel === 'a, area') return back;
      return null;
    },
  };
  const target = {
    closest(sel) {
      return back.closest(sel);
    },
  };
  return { back, target, attrs };
}

/**
 * 先注册冒泡 click：若未被 preventDefault，则 preventDefault 并同步派发 before-preparation。
 * 这与 ClientRouter.astro 的 document click + doPreparation 在首个 await 前 dispatch 一致。
 */
function installMockRouter(document, location) {
  const log = { navigatedTo: null, preventedBeforeNavigate: false, preparations: [] };
  document.addEventListener('click', (ev) => {
    const link = ev.target?.closest?.('a, area') || ev.target?.closest?.('[data-back]');
    if (!link) return;
    if (ev.defaultPrevented) {
      log.preventedBeforeNavigate = true;
      return;
    }
    ev.preventDefault();
    const href = link.getAttribute('href');
    log.navigatedTo = href;
    const to = new URL(href, 'http://localhost');
    const from = new URL(location.pathname, 'http://localhost');
    const prep = {
      type: 'astro:before-preparation',
      from,
      to,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    log.preparations.push({ from: from.pathname, to: to.pathname });
    document.dispatchEvent(prep);
  });
  return log;
}

function setup({ lang, pathname, switchedLang, sourcePath = '/posts/', scrollY = 240 }) {
  const base = createDispatcher();
  const { back, target } = makeBackLink(lang === 'en' ? '/en/posts/' : '/posts/');
  const document = {
    ...base,
    documentElement: { dataset: { lang } },
    referrer: 'http://localhost/posts/',
    querySelector(sel) {
      if (sel === '[data-back]') return back;
      return null;
    },
  };
  const location = { pathname, origin: 'http://localhost' };
  const historyCalls = [];
  const history = {
    length: 4,
    back() {
      historyCalls.push('back');
    },
  };
  const sessionStorage = memoryStorage();
  sessionStorage.setItem(
    BACK_NAV_STATE_KEY,
    JSON.stringify({
      source: { pathname: sourcePath, search: '', hash: '', scrollY, filterScrollLeft: 8 },
      switchedLang,
    }),
  );
  const host = {
    document,
    location,
    history,
    sessionStorage,
    window: { __yhInternalNav: true, scrollY: 0, scrollTo() {} },
  };
  const router = installMockRouter(document, location);
  bindBackNav(host);
  return { document, back, target, historyCalls, router, sessionStorage };
}

function clickBack(document, target) {
  const ev = {
    type: 'click',
    target,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    button: 0,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  document.dispatchEvent(ev);
  return ev;
}

test('Router 先注册且同步 before-preparation 时，切过语言的返回仍走菜单 href，不得 history.back', () => {
  const { document, target, historyCalls, router, sessionStorage } = setup({
    lang: 'en',
    pathname: '/en/posts/claude-vm-vps/',
    switchedLang: true,
    sourcePath: '/posts/',
    scrollY: 240,
  });

  clickBack(document, target);

  assert.deepEqual(historyCalls, [], '语言切换后不得 history.back()，否则 popstate 会中止菜单导航并回到另一语言文章');
  assert.equal(router.preventedBeforeNavigate, false);
  assert.equal(router.navigatedTo, '/en/posts/');
  assert.deepEqual(router.preparations, [{ from: '/en/posts/claude-vm-vps/', to: '/en/posts/' }]);
  assert.equal(router.navigatedTo.includes('claude-vm-vps'), false);
  const restore = JSON.parse(sessionStorage.getItem(BACK_NAV_RESTORE_KEY));
  assert.equal(restore.scrollY, 240);
  assert.equal(restore.filterScrollLeft, 8);
});

test('Router 先注册且同步 before-preparation 时，未切语言的返回仍 history.back，并挡住 Router', () => {
  const { document, target, historyCalls, router, sessionStorage } = setup({
    lang: 'zh',
    pathname: '/posts/claude-vm-vps/',
    switchedLang: false,
    sourcePath: '/posts/',
  });

  clickBack(document, target);

  assert.deepEqual(historyCalls, ['back']);
  assert.equal(router.preventedBeforeNavigate, true);
  assert.equal(router.navigatedTo, null);
  assert.equal(router.preparations.length, 0);
  assert.equal(sessionStorage.getItem(BACK_NAV_RESTORE_KEY), null);
});
