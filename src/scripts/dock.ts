/**
 * Dock 客户端（docs/DESIGN.md §10、§6）。
 *
 * 放大引擎：每帧对「目标值」做与时间相关的指数插值 v += (t − v)(1 − e^(−k·dt))。
 * 这是一阶临界阻尼：单调趋近、无弹簧、无过冲，离开后各项单调回到 1（不会小于 1）。
 * 指针位置同样做平滑；所有值收敛后停止 rAF。只写 CSS 变量，样式里只用于 transform。
 *
 * Dock 被 transition:persist 保留，状态挂在 window 上，站内跳转不重置、不重复绑定。
 */
import { isNavActive } from '../config/nav';
import { defaultLang, langs, locales, otherLang, type Lang } from '../config/locales';
import { dockMotion } from '../config/motion';
import { stripLang } from '../utils/path';
import { bindControls } from './controls';
import { once, prefersReducedMotion } from './runtime';

type Node = { el: HTMLElement; btn: HTMLElement | null; mag: boolean; c: number; base: number; size: number };
type State = {
  nodes: Node[];
  vertical: boolean;
  pointer: number | null;
  rawPointer: number | null;
  dot: number | null;
  raf: number;
  last: number;
  navigating: boolean;
  /** 跳转期间最后一次指针位置（视口坐标），过渡结束后据此校正悬停 */
  lastXY: [number, number] | null;
  bgSize: number;
};

// 参数见 config/motion.ts
const {
  maxScale: MAX,
  falloffSlots: SLOTS,
  kScale: K_SCALE,
  kPointer: K_POINTER,
  kDot: K_DOT,
  epsilon: EPS,
  glyph: GLYPH,
  dotGap: DOT_GAP,
} = dockMotion;

const w = window as unknown as { __yhDock?: State };
const S: State = (w.__yhDock ??= {
  nodes: [],
  vertical: false,
  pointer: null,
  rawPointer: null,
  dot: null,
  raf: 0,
  last: 0,
  navigating: false,
  lastXY: null,
  bgSize: 0,
});

const mqVertical = window.matchMedia('(min-width: 1024px)');
const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
const dock = () => document.querySelector<HTMLElement>('[data-dock]');
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const canMagnify = () => S.vertical && mqFine.matches && !prefersReducedMotion();

function measure() {
  const list = dock()?.querySelector<HTMLElement>('[data-dock-list]');
  if (!list) return;
  S.vertical = mqVertical.matches;
  const v = S.vertical;
  const old = new Map(S.nodes.map((n) => [n.el, n.c]));
  S.nodes = [...list.children].map((child) => {
    const el = child as HTMLElement;
    return {
      el,
      btn: el.querySelector<HTMLElement>('.dock-btn'),
      mag: el.hasAttribute('data-mag'),
      c: old.get(el) ?? 1,
      base: v
        ? el.offsetTop - list.offsetTop + el.offsetHeight / 2
        : el.offsetLeft - list.offsetLeft + el.offsetWidth / 2,
      size: v ? el.offsetHeight : el.offsetWidth,
    };
  });
  const bg = dock()?.querySelector<HTMLElement>('.dock-bg');
  S.bgSize = bg ? (v ? bg.offsetHeight : bg.offsetWidth) : 0;
  if (!v) S.rawPointer = S.pointer = null;
}

function activeIndex(d: HTMLElement) {
  const li = d.querySelector('[aria-current="page"]')?.closest('li');
  const idx = li ? S.nodes.findIndex((n) => n.el === li) : -1;
  d.querySelector('[data-dock-dot]')?.classList.toggle('on', idx >= 0);
  return idx;
}

/** 余弦衰减：距离 0 → 1，距离 ≥ R → 0，处处平滑 */
const falloff = (d: number, R: number) => (Math.abs(d) >= R ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * d) / R));

function frame(now: number) {
  S.raf = 0;
  const d = dock();
  if (!d || !S.nodes.length) return;
  const dt = Math.min(0.05, S.last ? (now - S.last) / 1000 : 1 / 60);
  S.last = now;
  const v = S.vertical;
  const mag = canMagnify();
  let moving = false;

  if (S.rawPointer == null || !mag) S.pointer = null;
  else if (S.pointer == null) S.pointer = S.rawPointer;
  else {
    S.pointer += (S.rawPointer - S.pointer) * (1 - Math.exp(-K_POINTER * dt));
    if (Math.abs(S.rawPointer - S.pointer) > 0.05) moving = true;
    else S.pointer = S.rawPointer;
  }

  const slot = S.nodes.find((n) => n.mag)?.size ?? 44;
  const R = slot * SLOTS;
  const a = 1 - Math.exp(-K_SCALE * dt);
  for (const n of S.nodes) {
    const t = n.mag && S.pointer != null ? 1 + (MAX - 1) * falloff(S.pointer - n.base, R) : 1;
    n.c += (t - n.c) * a;
    if (Math.abs(t - n.c) < EPS) n.c = t;
    else moving = true;
    if (n.c < 1) n.c = 1;
  }

  // 放大量换算成上下平移：以整体中心为基准向两端推开，背景胶囊等量伸长
  const extra = S.nodes.map((n) => (n.mag ? n.size * (n.c - 1) : 0));
  const total = extra.reduce((s, e) => s + e, 0);
  let acc = 0;
  const offs = S.nodes.map((n, i) => {
    const off = v ? acc + extra[i] / 2 - total / 2 : 0;
    acc += extra[i];
    const plate = n.btn?.offsetWidth ?? 0;
    const dx = v ? (plate * (n.c - 1)) / 2 : 0;
    n.el.style.setProperty('--ty', `${r3(off)}px`);
    n.el.style.setProperty('--dx', `${r3(dx)}px`);
    n.btn?.style.setProperty('--s', String(r3(n.c)));
    return off;
  });
  const bg = d.querySelector<HTMLElement>('.dock-bg');
  if (bg && v && S.bgSize) {
    bg.style.setProperty('--grow-sy', String(r3((S.bgSize + total) / S.bgSize)));
  } else bg?.style.removeProperty('--grow-sy');

  const idx = activeIndex(d);
  if (idx >= 0) {
    const n = S.nodes[idx];
    const dotEl = d.querySelector<HTMLElement>('[data-dock-dot]')!;
    const ds = dotEl.offsetWidth;
    const target = n.base + offs[idx];
    if (S.dot == null || prefersReducedMotion()) S.dot = target;
    else {
      S.dot += (target - S.dot) * (1 - Math.exp(-K_DOT * dt));
      if (Math.abs(target - S.dot) < 0.05) S.dot = target;
      else moving = true;
    }
    if (v) {
      // 字形右侧：随放大向右让开（字形 20px，间距 6px）
      const x = d.offsetWidth / 2 + (GLYPH * n.c) / 2 + DOT_GAP - ds / 2;
      dotEl.style.setProperty('--dot-x', `${r3(x)}px`);
      dotEl.style.setProperty(
        '--dot-y',
        `${r3(S.dot - ds / 2 + d.querySelector<HTMLElement>('[data-dock-list]')!.offsetTop)}px`,
      );
    } else {
      const list = d.querySelector<HTMLElement>('[data-dock-list]')!;
      dotEl.style.setProperty('--dot-x', `${r3(S.dot - ds / 2 + list.offsetLeft)}px`);
      dotEl.style.setProperty('--dot-y', `${r3(d.offsetHeight - ds - 5)}px`);
    }
  }
  if (moving) S.raf = requestAnimationFrame(frame);
  else S.last = 0;
}

const kick = () => {
  if (!S.raf) S.raf = requestAnimationFrame(frame);
};

/** 某路径（含语言前缀）对应的导航项 key；不属于任何导航项时为 null */
function navKeyFor(pathname: string): string | null {
  const path = stripLang(pathname);
  const hit = [...(dock()?.querySelectorAll<HTMLElement>('[data-nav]') ?? [])].find((a) =>
    (a.dataset.paths ?? '').split(' ').some((p) => p && isNavActive(p, path)),
  );
  return hit?.dataset.nav ?? null;
}

/** 切换激活项（aria-current）；已是当前状态时不触碰 DOM，避免多余的样式重算 */
function setActive(d: HTMLElement, key: string | null) {
  d.querySelectorAll<HTMLElement>('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === key;
    if (on === (a.getAttribute('aria-current') === 'page')) return;
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  kick();
}

/** 跳转后按新页面同步：激活项、文案、语言链接 */
function syncDock() {
  const d = dock();
  if (!d) return;
  const root = document.documentElement;
  const lang: Lang = (langs as readonly string[]).includes(root.dataset.lang ?? '')
    ? (root.dataset.lang as Lang)
    : defaultLang;
  const key = lang[0].toUpperCase() + lang.slice(1); // data-href-zh → dataset.hrefZh
  const lbl = (el: HTMLElement) => el.dataset[`label${key}`];
  if (lbl(d)) d.setAttribute('aria-label', lbl(d)!);
  d.querySelectorAll<HTMLAnchorElement>('[data-href-zh]').forEach((a) => (a.href = a.dataset[`href${key}`]!));
  setActive(d, navKeyFor(location.pathname));
  const other = otherLang(lang);
  const langLink = d.querySelector<HTMLAnchorElement>('[data-dock-lang]');
  if (langLink) {
    langLink.href = root.getAttribute(`data-alt-${other}`) || (other === defaultLang ? '/' : `/${other}/`);
    langLink.hreflang = locales[other].html;
    langLink.dataset.setLang = other;
    const g = langLink.querySelector('[data-glyph]');
    if (g) g.textContent = locales[other].short;
  }
  d.querySelectorAll<HTMLElement>('.dock-btn[data-label-zh]').forEach((b) => {
    const text = lbl(b)!;
    b.setAttribute('aria-label', text);
    const tip = b.parentElement?.querySelector('.dock-tip');
    if (tip && tip.textContent !== text) tip.textContent = text;
  });
  kick();
}

/**
 * 悬停态由 JS 镜像成 .is-hover（样式见 dock.css）。
 * 原因：视图过渡期间浏览器暂停命中测试，真实的 :hover 会被清空，
 * 底板与提示会先消失再淡入，看起来像 Dock「失焦」闪了一下。跳转期间保持镜像不变，
 * 过渡结束后按最后的指针位置校正一次。
 */
function setHover(d: HTMLElement, item: Element | null) {
  d.querySelectorAll('.dock-item.is-hover').forEach((x) => x !== item && x.classList.remove('is-hover'));
  item?.classList.add('is-hover');
}

/** 跳转（含视图过渡）结束：按最后的指针位置同步悬停与放大 */
function endNavigation(d: HTMLElement) {
  S.navigating = false;
  const xy = S.lastXY;
  S.lastXY = null;
  if (xy) {
    const hit = document.elementFromPoint(xy[0], xy[1]);
    const inDock = !!hit && d.contains(hit);
    setHover(d, inDock ? hit.closest('.dock-item') : null);
    if (!inDock) S.rawPointer = null;
  }
  kick();
}

function bind(d: HTMLElement) {
  d.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !S.vertical) return;
    const list = d.querySelector<HTMLElement>('[data-dock-list]')!;
    S.rawPointer = e.clientY - list.getBoundingClientRect().top;
    kick();
  });
  d.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || S.navigating) return;
    setHover(d, (e.target as Element).closest('.dock-item'));
  });
  d.addEventListener('pointerleave', (e) => {
    // 视图过渡期间浏览器会短暂接管指针，忽略这期间的 leave，保持悬停与放大连续
    if (e.pointerType !== 'mouse' || S.navigating) return;
    setHover(d, null);
    S.rawPointer = null;
    kick();
  });
  // 点击后立即切换激活项（不等新页面），激活点随即开始滑动
  d.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-nav], a[data-home]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    setActive(d, a.dataset.nav ?? 'home');
  });
  document.addEventListener('astro:before-preparation', (e) => {
    S.navigating = true;
    // 前进 / 后退等非点击跳转：同样在加载前就切换激活项
    const key = navKeyFor((e as Event & { to: URL }).to.pathname);
    if (key) setActive(d, key);
  });
  document.addEventListener('astro:before-swap', (e) => {
    const vt = (e as Event & { viewTransition?: ViewTransition }).viewTransition;
    const done = () => endNavigation(d);
    if (vt) vt.finished.then(done, done);
    else requestAnimationFrame(done);
  });
  // 兜底：指针已在 Dock 外移动时收回
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if (S.navigating) {
        S.lastXY = [e.clientX, e.clientY];
        return;
      }
      if (S.rawPointer == null && !d.querySelector('.is-hover')) return;
      if (!(e.target as Element | null)?.closest?.('[data-dock]')) {
        setHover(d, null);
        S.rawPointer = null;
        kick();
      }
    },
    { passive: true },
  );
  const remeasure = () => {
    measure();
    kick();
  };
  window.addEventListener('resize', remeasure);
  mqVertical.addEventListener('change', remeasure);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', kick);
  document.fonts?.ready.then(remeasure);
}

bindControls();
if (once('dock')) {
  const init = () => {
    const d = dock();
    if (!d) return;
    if (!S.nodes.length || !S.nodes[0].el.isConnected) {
      bind(d);
      measure();
    }
    syncDock();
  };
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:after-swap', syncDock);
}
