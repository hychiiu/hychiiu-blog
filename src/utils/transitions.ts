import type { TransitionDirectionalAnimations } from 'astro';

/**
 * 页面切换（见 docs/DESIGN.md §6）：旧页 80ms 快速淡出，新页在旧页基本淡完时（60ms）开始 200ms 淡入。
 * 两页文字不会叠在一起出现「重影」，总时长仍不到 300ms。系统开启「减少动态效果」时 Astro 会自动关闭动画。
 */
const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
const anim = {
  old: { name: 'yh-page-out', duration: '80ms', easing: 'linear', fillMode: 'both' },
  new: { name: 'yh-page-in', duration: '200ms', delay: '60ms', easing: ease, fillMode: 'both' },
};
export const pageFade: TransitionDirectionalAnimations = { forwards: anim, backwards: anim };

/** 列表标题 → 文章标题 的共享元素名（与语言无关，便于同语言内跳转时形变） */
export function titleTransition(href: string): string {
  const key = href.replace(/^\/en(?=\/)/, '').replace(/\/+$/, '');
  let h = 0;
  for (const ch of key) h = (Math.imul(h, 31) + ch.codePointAt(0)!) | 0;
  return `t-${(h >>> 0).toString(36)}`;
}
