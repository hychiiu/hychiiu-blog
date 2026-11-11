/**
 * 主题切换与语言记忆：document 级事件委托，只绑定一次。
 * 作用于任何带 [data-theme-toggle] / [data-set-lang] 的元素（Dock）。
 */
import { once } from './runtime';

export function bindControls() {
  if (!once('controls')) return;
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const langLink = target?.closest<HTMLAnchorElement>('[data-set-lang]');
    if (langLink) {
      try {
        localStorage.setItem('lang', langLink.dataset.setLang!);
      } catch {}
      return;
    }
    if (!target?.closest('[data-theme-toggle]')) return;
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
      if (next === sys) localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {}
    window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  });
}
