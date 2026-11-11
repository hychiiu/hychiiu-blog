import type { TransitionDirectionalAnimations } from 'astro';

/** 页面切换：旧页轻微上移淡出，新页从下方淡入（约 250ms）。系统开启「减少动态效果」时 Astro 会自动关闭动画 */
const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
const anim = {
  old: { name: 'yh-page-out', duration: '160ms', easing: 'ease-in', fillMode: 'both' },
  new: { name: 'yh-page-in', duration: '260ms', easing: ease, fillMode: 'both' },
};
export const pageFade: TransitionDirectionalAnimations = { forwards: anim, backwards: anim };

/** 列表标题 → 文章标题 的共享元素名（与语言无关，便于同语言内跳转时形变） */
export function titleTransition(href: string): string {
  const key = href.replace(/^\/en(?=\/)/, '').replace(/\/+$/, '');
  let h = 0;
  for (const ch of key) h = (Math.imul(h, 31) + ch.codePointAt(0)!) | 0;
  return `t-${(h >>> 0).toString(36)}`;
}
