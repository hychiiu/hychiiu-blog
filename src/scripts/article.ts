/**
 * 返回链接：若是从本站页面进入（含 ClientRouter 站内跳转），用 history.back() 回到原列表并恢复滚动位置；
 * 直接打开文章时则按链接跳到列表页。
 * 回到顶部：滚过一屏后淡入。
 */
import { once, prefersReducedMotion } from './runtime';

if (once('article')) {
  document.addEventListener('click', (e) => {
    const back = (e.target as Element).closest<HTMLAnchorElement>('[data-back]');
    if (back && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button)) {
      let sameOrigin = false;
      try {
        sameOrigin = !!document.referrer && new URL(document.referrer).origin === location.origin;
      } catch {}
      if ((window.__yhInternalNav || sameOrigin) && history.length > 1) {
        e.preventDefault();
        history.back();
      }
      return;
    }
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
