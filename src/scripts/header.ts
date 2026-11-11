/**
 * 顶部导航客户端：
 * - 主题切换 / 语言记忆（事件委托，只绑定一次）
 * - 头部被 transition:persist 保留，每次站内跳转后按新页面同步：激活胶囊、链接语言、工具条备用链接
 * - 滚动后出现半透明底与发丝线
 */
import { stripLang } from '../utils/path';
import { once } from './runtime';

type Lang = 'zh' | 'en';
const header = () => document.querySelector<HTMLElement>('[data-header]');

function bindControls() {
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

/** 按当前 URL 与 <html> 上的语言 / 备用链接更新常驻的头部 */
function syncHeader() {
  const h = header();
  if (!h) return;
  const root = document.documentElement;
  const lang: Lang = root.dataset.lang === 'en' ? 'en' : 'zh';
  const path = stripLang(location.pathname);
  const key = lang === 'zh' ? 'Zh' : 'En';
  h.querySelectorAll<HTMLAnchorElement>('[data-href-zh]').forEach((a) => {
    a.href = a.dataset[`href${key}`]!;
  });
  h.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => {
    const p = a.dataset.path!;
    const active = p === '/' ? path === '/' : path.startsWith(p.replace(/\/$/, ''));
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
    const label = a.dataset[`label${key}`];
    if (label && a.textContent !== label) a.textContent = label;
  });
  h.querySelectorAll<HTMLAnchorElement>('[data-lang-link]').forEach((a) => {
    const l = a.dataset.langLink as Lang;
    a.href = root.getAttribute(`data-alt-${l}`) || (l === 'en' ? '/en/' : '/');
    a.dataset.active = String(l === lang);
    if (l === lang) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
  const theme = h.querySelector<HTMLElement>('[data-theme-toggle]');
  if (theme) theme.setAttribute('aria-label', lang === 'zh' ? '切换深浅色' : 'Toggle theme');
}

const onScroll = () => header()?.classList.toggle('scrolled', window.scrollY > 8);

if (once('header')) {
  bindControls();
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('astro:after-swap', syncHeader);
  document.addEventListener('astro:page-load', () => {
    syncHeader();
    onScroll();
  });
}
