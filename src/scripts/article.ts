/**
 * 回到顶部：滚过一屏后淡入。
 * 文章页「返回」由 scripts/back-nav.ts 处理（全局加载，以便从列表进入时就记住来源菜单）。
 */
import { once, prefersReducedMotion } from './runtime';

if (once('article')) {
  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-to-top]')) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  });
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      document.querySelector('[data-to-top]')?.classList.toggle('on', scrollY > innerHeight * 0.9);
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('astro:page-load', onScroll);
}
