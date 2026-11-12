/**
 * 评论区客户端（components/Comments.astro）：
 * - 按 data-mode 挂载 utterances：auto 在评论区接近视口时自动挂载，click 等点击按钮；
 * - utterances 就绪（本页 iframe 的首次 resize 消息）后给 [data-c-stage] 加 data-ready，由 CSS 替换静态列表并淡入；
 * - 站点主题切换时同步 utterances 主题；ClientRouter 跳转时断开旧页面的观察器，在新页面重新初始化。
 */
import { comments } from '../config/integrations';
import { once } from './runtime';

const { origin: ORIGIN, theme: THEMES, rootMargin } = comments.utterances;
const theme = () => (document.documentElement.dataset.theme === 'dark' ? THEMES.dark : THEMES.light);
const frame = () => document.querySelector<HTMLIFrameElement>('[data-utterances] iframe.utterances-frame');

function mount(slot: HTMLElement) {
  if (slot.childElementCount) return;
  const s = document.createElement('script');
  s.src = `${ORIGIN}/client.js`;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.setAttribute('repo', slot.dataset.repo!);
  s.setAttribute('issue-number', slot.dataset.issue!);
  s.setAttribute('theme', theme());
  slot.appendChild(s);
}

let observer: IntersectionObserver | undefined;

function init() {
  const slot = document.querySelector<HTMLElement>('[data-utterances]');
  if (slot?.dataset.mode !== 'auto' || slot.dataset.bound) return;
  slot.dataset.bound = '';
  if (!('IntersectionObserver' in window)) return mount(slot);
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer?.disconnect();
      mount(slot);
    },
    { rootMargin },
  );
  observer.observe(slot.closest('[data-c-stage]') ?? slot);
}

if (once('comments')) {
  // 首次进入文章页时本模块可能晚于 astro:page-load 执行，所以先直接初始化一次（init 自带去重）
  init();
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', () => {
    observer?.disconnect();
    observer = undefined;
  });
  window.addEventListener('themechange', () => {
    frame()?.contentWindow?.postMessage({ type: 'set-theme', theme: theme() }, ORIGIN);
  });
  window.addEventListener('message', (e) => {
    if (e.origin !== ORIGIN || (e.data as { type?: string })?.type !== 'resize') return;
    if (e.source !== frame()?.contentWindow) return;
    document.querySelector('[data-c-stage]')?.setAttribute('data-ready', '');
  });
  // click 模式：「或在本页登录后留言」
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-utterances-load]');
    const slot = document.querySelector<HTMLElement>('[data-utterances]');
    if (!btn || !slot) return;
    btn.hidden = true;
    mount(slot);
  });
}
