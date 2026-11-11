import { dock } from './dom';

/* ---------- magnification engine ----------
 * 无回弹：每帧做与时间相关的指数插值 v += (t - v) * (1 - e^(-k·dt))，属于临界阻尼，单调收敛、不会甩动；
 * 指针位置本身也做平滑，避免悬停时抖动；收敛后停止 rAF。
 * Dock 节点被 transition:persist 保留，引擎状态挂在 window 上，跳转时不重置。
 */
type EngineState = {
  nodes: { el: HTMLElement; mag: boolean; c: number; t: number; base: number; size: number }[];
  pointer: number | null; // 平滑后的指针位置
  rawPointer: number | null;
  raf: number;
  last: number;
  dot: number | null;
  navigating: boolean;
  leftDuringNav: boolean;
  bound: boolean;
};
const w = window as unknown as { __dock?: EngineState };
const S: EngineState = (w.__dock ??= {
  nodes: [],
  pointer: null,
  rawPointer: null,
  raf: 0,
  last: 0,
  dot: null,
  navigating: false,
  leftDuringNav: false,
  bound: false,
});

const MAX = 1.5;
const SIGMA = 52;
const K_SCALE = 16; // 1/s：离开后约 280ms 回到 1%以内，单调无过冲
const K_POINTER = 22;
const K_DOT = 16;
const EPS = 0.001;
const mqDesk = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const vertical = () => window.matchMedia('(min-width: 1024px)').matches;
const canMagnify = () => mqDesk.matches && !mqMotion.matches;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function measure() {
  const list = dock()?.querySelector<HTMLElement>('[data-dock-list]');
  if (!list) return;
  const v = vertical();
  const old = new Map(S.nodes.map((n) => [n.el, n]));
  S.nodes = [...list.children].map((el) => {
    const h = el as HTMLElement;
    return {
      el: h,
      mag: h.hasAttribute('data-mag'),
      c: old.get(h)?.c ?? 1,
      t: 1,
      base: v ? h.offsetTop + h.offsetHeight / 2 : h.offsetLeft + h.offsetWidth / 2,
      size: v ? h.offsetHeight : h.offsetWidth,
    };
  });
}

function activeIndex() {
  const d = dock();
  const li = d?.querySelector('[aria-current="page"]')?.closest('li');
  const idx = li ? S.nodes.findIndex((n) => n.el === li) : -1;
  d?.querySelector('[data-dock-dot]')?.classList.toggle('on', idx >= 0);
  return idx;
}

function frame(now: number) {
  S.raf = 0;
  const d = dock();
  if (!d || !S.nodes.length) return;
  const dt = Math.min(0.05, S.last ? (now - S.last) / 1000 : 1 / 60);
  S.last = now;
  const v = vertical();
  const mag = canMagnify();
  d.classList.toggle('is-mag', mag);
  let moving = false;

  // 平滑指针
  if (S.rawPointer == null) S.pointer = null;
  else if (S.pointer == null) S.pointer = S.rawPointer;
  else {
    S.pointer += (S.rawPointer - S.pointer) * (1 - Math.exp(-K_POINTER * dt));
    if (Math.abs(S.rawPointer - S.pointer) > 0.1) moving = true;
  }

  const a = 1 - Math.exp(-K_SCALE * dt);
  for (const n of S.nodes) {
    n.t =
      n.mag && mag && S.pointer != null
        ? 1 + (MAX - 1) * Math.exp(-((S.pointer - n.base) ** 2) / (2 * SIGMA * SIGMA))
        : 1;
    n.c += (n.t - n.c) * a;
    if (Math.abs(n.t - n.c) < EPS) n.c = n.t;
    else moving = true;
  }

  const extra = S.nodes.map((n) => (n.mag ? n.size * (n.c - 1) : 0));
  const total = extra.reduce((s, e) => s + e, 0);
  let acc = 0;
  let maxE = 0;
  const offs = S.nodes.map((n, i) => {
    const off = acc + extra[i] / 2 - total / 2;
    acc += extra[i];
    maxE = Math.max(maxE, extra[i]);
    n.el.style.setProperty('--ty', v ? `${r3(off)}px` : '0px');
    n.el.style.setProperty('--dx', v ? `${r3(extra[i])}px` : '0px');
    n.el.querySelector<HTMLElement>('.dock-btn')?.style.setProperty('--s', String(v ? r3(n.c) : 1));
    return off;
  });
  const bg = d.querySelector<HTMLElement>('.dock-bg');
  bg?.style.setProperty('--grow-y', v ? `${r3(total / 2)}px` : '0px');
  bg?.style.setProperty('--grow-x', v ? `${r3(maxE * 0.92)}px` : '0px');

  const idx = activeIndex();
  if (idx >= 0) {
    const target = S.nodes[idx].base + (v ? offs[idx] : 0);
    if (S.dot == null || mqMotion.matches) S.dot = target;
    else {
      S.dot += (target - S.dot) * (1 - Math.exp(-K_DOT * dt));
      if (Math.abs(target - S.dot) < 0.05) S.dot = target;
      else moving = true;
    }
    const el = d.querySelector<HTMLElement>('[data-dock-dot]')!;
    el.style.setProperty('--dot-x', v ? '0px' : `${r3(S.dot)}px`);
    el.style.setProperty('--dot-y', v ? `${r3(S.dot)}px` : '0px');
  }
  if (moving) S.raf = requestAnimationFrame(frame);
  else S.last = 0;
}
export const kick = () => {
  if (!S.raf) S.raf = requestAnimationFrame(frame);
};

function bind() {
  const d = dock();
  if (!d || S.bound) return;
  S.bound = true;
  d.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const list = d.querySelector<HTMLElement>('[data-dock-list]')!;
    const r = list.getBoundingClientRect();
    S.rawPointer = vertical() ? e.clientY - r.top : e.clientX - r.left;
    kick();
  });
  d.addEventListener('pointerleave', () => {
    // 跳转过程中视图过渡会短暂接管指针，忽略这期间的 leave，保持放大状态
    if (S.navigating) {
      S.leftDuringNav = true;
      return;
    }
    S.rawPointer = null;
    kick();
  });
  // 点击后立即把激活点移到新位置（不等页面加载）
  d.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-nav], a[data-home]');
    if (!a) return;
    const key = a.dataset.nav ?? 'home';
    d.querySelectorAll('[data-nav]').forEach((x) => x.removeAttribute('aria-current'));
    d.querySelector(`[data-nav="${key}"]`)?.setAttribute('aria-current', 'page');
    kick();
  });
  document.addEventListener('astro:before-preparation', () => (S.navigating = true));
  document.addEventListener('astro:page-load', () => {
    setTimeout(() => {
      S.navigating = false;
      // 跳转期间指针确实离开了 Dock，则现在平滑收回；否则保持放大
      if (S.leftDuringNav) S.rawPointer = null;
      S.leftDuringNav = false;
      kick();
    }, 60);
  });
  // 兜底：指针在 Dock 外移动时收回（防止跳转期间漏掉 pointerleave）
  document.addEventListener(
    'pointermove',
    (e) => {
      if (S.rawPointer == null || S.navigating || e.pointerType !== 'mouse') return;
      if (!(e.target as Element).closest?.('[data-dock]')) {
        S.rawPointer = null;
        kick();
      }
    },
    { passive: true },
  );
  window.addEventListener('resize', () => {
    measure();
    kick();
  });
  mqMotion.addEventListener('change', kick);
}

/** 首次绑定事件；Dock 节点被替换（极少见）时重新测量；然后刷新一帧 */
export function initEngine() {
  bind();
  if (!S.nodes.length || !S.nodes[0].el.isConnected) measure();
  kick();
}
