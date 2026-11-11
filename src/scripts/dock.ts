/**
 * Dock 客户端（docs/DESIGN.md §10、§6）。
 *
 * 放大引擎：每帧对「目标值」做与时间相关的指数插值 v += (t − v)(1 − e^(−k·dt))。
 * 这是一阶临界阻尼：单调趋近、无弹簧、无过冲，离开后各项单调回到 1（不会小于 1）。
 * 指针位置同样做平滑；所有值收敛后停止 rAF。只写 CSS 变量，样式里只用于 transform。
 *
 * Dock 被 transition:persist 保留，状态挂在 window 上，站内跳转不重置、不重复绑定。
 */
import { stripLang } from '../utils/path';
import { bindControls } from './controls';
import { once, prefersReducedMotion } from './runtime';

type Lang = 'zh' | 'en';
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
  leftDuringNav: boolean;
  bgSize: number;
};

const MAX = 1.28; // 最大放大倍数
const SLOTS = 2.5; // 余弦衰减半径（以槽位计，约影响上下各两项）
const K_SCALE = 18; // 1/s：离开后约 250ms 回到 1% 以内
const K_POINTER = 24;
const K_DOT = 20;
const EPS = 0.0005;
const GLYPH = 20; // 图标字形尺寸，与 Dock.astro 一致

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
  leftDuringNav: false,
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
      const x = d.offsetWidth / 2 + (GLYPH * n.c) / 2 + 6 - ds / 2;
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

export const kick = () => {
  if (!S.raf) S.raf = requestAnimationFrame(frame);
};

/** 跳转后按新页面同步：激活项、文案、语言链接 */
function syncDock() {
  const d = dock();
  if (!d) return;
  const root = document.documentElement;
  const lang: Lang = root.dataset.lang === 'en' ? 'en' : 'zh';
  const key = lang === 'zh' ? 'Zh' : 'En';
  const path = stripLang(location.pathname);
  const lbl = (el: HTMLElement) => el.dataset[`label${key}`];
  if (lbl(d)) d.setAttribute('aria-label', lbl(d)!);
  d.querySelectorAll<HTMLAnchorElement>('[data-href-zh]').forEach((a) => (a.href = a.dataset[`href${key}`]!));
  d.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => {
    const p = a.dataset.path!;
    const active = p === '/' ? path === '/' : path.startsWith(p.replace(/\/$/, ''));
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const other: Lang = lang === 'zh' ? 'en' : 'zh';
  const langLink = d.querySelector<HTMLAnchorElement>('[data-dock-lang]');
  if (langLink) {
    langLink.href = root.getAttribute(`data-alt-${other}`) || (other === 'en' ? '/en/' : '/');
    langLink.hreflang = other === 'zh' ? 'zh-CN' : 'en';
    langLink.dataset.setLang = other;
    const g = langLink.querySelector('[data-glyph]');
    if (g) g.textContent = other === 'en' ? 'EN' : '中';
  }
  d.querySelectorAll<HTMLElement>('.dock-btn[data-label-zh]').forEach((b) => {
    const text = lbl(b)!;
    b.setAttribute('aria-label', text);
    const tip = b.parentElement?.querySelector('.dock-tip');
    if (tip && tip.textContent !== text) tip.textContent = text;
  });
  kick();
}

function bind(d: HTMLElement) {
  d.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !S.vertical) return;
    const list = d.querySelector<HTMLElement>('[data-dock-list]')!;
    S.rawPointer = e.clientY - list.getBoundingClientRect().top;
    kick();
  });
  d.addEventListener('pointerleave', () => {
    // 视图过渡期间浏览器会短暂接管指针，忽略这期间的 leave，保持放大连续
    if (S.navigating) {
      S.leftDuringNav = true;
      return;
    }
    S.rawPointer = null;
    kick();
  });
  // 点击后立即把激活点移向新项（不等新页面）
  d.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-nav], a[data-home]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const key = a.dataset.nav ?? 'home';
    d.querySelectorAll('[data-nav]').forEach((x) => x.removeAttribute('aria-current'));
    d.querySelector(`[data-nav="${key}"]`)?.setAttribute('aria-current', 'page');
    kick();
  });
  document.addEventListener('astro:before-preparation', () => (S.navigating = true));
  document.addEventListener('astro:page-load', () => {
    setTimeout(() => {
      S.navigating = false;
      if (S.leftDuringNav && !d.matches(':hover')) S.rawPointer = null;
      S.leftDuringNav = false;
      kick();
    }, 60);
  });
  // 兜底：指针已在 Dock 外移动时收回
  document.addEventListener(
    'pointermove',
    (e) => {
      if (S.rawPointer == null || S.navigating || e.pointerType !== 'mouse') return;
      if (!(e.target as Element | null)?.closest?.('[data-dock]')) {
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
