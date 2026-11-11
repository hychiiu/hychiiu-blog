/**
 * Dock 上的主题 / 语言按钮，以及跳转后把常驻的 Dock 与当前页面同步（链接语言、激活项、提示文字）。
 */
import { stripLang } from '../../utils/path';
import { dock } from './dom';

type Lang = 'zh' | 'en';

/** 主题切换与语言记忆：事件委托，只绑定一次 */
export function bindControls() {
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

/** 根据当前 URL 与 <html> 上的语言 / 备用链接更新 Dock；返回后由调用方触发引擎重算 */
export function syncDock() {
  const d = dock();
  if (!d) return;
  const root = document.documentElement;
  const lang = (root.dataset.lang === 'en' ? 'en' : 'zh') as Lang;
  const other: Lang = lang === 'zh' ? 'en' : 'zh';
  const path = stripLang(location.pathname);
  d.querySelectorAll<HTMLAnchorElement>('[data-href-zh]').forEach((a) => {
    a.href = a.dataset[lang === 'zh' ? 'hrefZh' : 'hrefEn']!;
  });
  d.querySelectorAll<HTMLElement>('[data-nav]').forEach((a) => {
    const key = a.dataset.nav!;
    const active = key === 'home' ? path === '/' : path.startsWith(`/${key}`);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
    const l = a.dataset[lang === 'zh' ? 'labelZh' : 'labelEn'];
    if (l) {
      a.setAttribute('aria-label', l);
      const tip = a.parentElement?.querySelector('[data-tip]');
      if (tip) tip.textContent = l;
    }
  });
  const theme = d.querySelector<HTMLElement>('[data-theme-toggle]');
  if (theme) {
    const l = theme.dataset[lang === 'zh' ? 'labelZh' : 'labelEn']!;
    theme.setAttribute('aria-label', l);
    const tip = theme.parentElement?.querySelector('[data-tip]');
    if (tip) tip.textContent = l;
  }
  const sw = d.querySelector<HTMLAnchorElement>('[data-lang-switch]');
  if (sw) {
    sw.href = root.getAttribute(`data-alt-${other}`) || (other === 'en' ? '/en/' : '/');
    sw.dataset.setLang = other;
    sw.hreflang = other === 'zh' ? 'zh-CN' : 'en';
    sw.setAttribute('aria-label', lang === 'zh' ? '切换语言' : 'Switch language');
    const g = sw.querySelector<HTMLElement>('[data-lang-glyph]');
    if (g) {
      g.textContent = other === 'zh' ? '中' : 'EN';
      g.toggleAttribute('data-cjk', other === 'zh');
    }
    const tip = d.querySelector('[data-lang-tip]');
    if (tip) tip.textContent = other === 'zh' ? '中文' : 'English';
  }
}
