/**
 * 浏览器端脚本共用的小工具与全局标记。
 * 模块脚本在 ClientRouter 站内跳转时不会重复执行，但开发时热更新可能重复加载，因此全局监听统一用 once() 保护。
 */
declare global {
  interface Window {
    /** Base.astro 内联脚本：发生过站内跳转（文章页返回链接据此决定用 history.back()） */
    __yhInternalNav?: boolean;
    __yhOnce?: Record<string, true>;
  }
}

/** 同一页面生命周期内，某个 key 只返回一次 true */
export function once(key: string): boolean {
  const flags = (window.__yhOnce ??= {});
  if (flags[key]) return false;
  flags[key] = true;
  return true;
}

/** 浏览器空闲时执行（不支持 requestIdleCallback 时退化为短延时） */
export function idle(fn: () => void, timeout = 800): void {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout });
  else setTimeout(fn, 50);
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
