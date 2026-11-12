/**
 * 评论区客户端（components/Comments.astro）：
 * - 按 data-mode 挂载 utterances：auto 在页面加载后浏览器空闲时挂载，click 等点击按钮；
 *   utterances 给 iframe 加了 loading="lazy"，挂载后改成 eager，免得滚到底才开始加载；
 * - utterances 就绪（本页 iframe 的首次 resize 消息）后给 [data-c-stage] 所在区块加 data-ready，由 CSS 替换静态列表并淡入；
 * - 站点主题切换时同步 utterances 主题；ClientRouter 跳转后在新页面重新初始化（init 自带去重）。
 */
import { comments } from '../config/integrations';
import { idle, once } from './runtime';

const { origin: ORIGIN, theme: THEMES } = comments.utterances;
const theme = () => (document.documentElement.dataset.theme === 'dark' ? THEMES.dark : THEMES.light);
const frame = () => document.querySelector<HTMLIFrameElement>('[data-utterances] iframe.utterances-frame');

function eagerIframe(slot: HTMLElement) {
  const fix = () => {
    const f = slot.querySelector('iframe');
    if (!f) return false;
    f.loading = 'eager';
    return true;
  };
  if (fix()) return;
  const mo = new MutationObserver(() => fix() && mo.disconnect());
  mo.observe(slot, { childList: true, subtree: true });
}

function mount(slot: HTMLElement) {
  if (!slot.isConnected || slot.querySelector('script')) return;
  const s = document.createElement('script');
  s.src = `${ORIGIN}/client.js`;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.setAttribute('repo', slot.dataset.repo!);
  s.setAttribute('issue-number', slot.dataset.issue!);
  s.setAttribute('theme', theme());
  eagerIframe(slot);
  slot.appendChild(s);
}

function init() {
  const slot = document.querySelector<HTMLElement>('[data-utterances]');
  if (slot?.dataset.mode !== 'auto' || slot.dataset.bound) return;
  slot.dataset.bound = '';
  idle(() => mount(slot), 1500);
}

if (once('comments')) {
  // 首次进入文章页时本模块可能晚于 astro:page-load 执行，所以先直接初始化一次
  init();
  document.addEventListener('astro:page-load', init);
  window.addEventListener('themechange', () => {
    frame()?.contentWindow?.postMessage({ type: 'set-theme', theme: theme() }, ORIGIN);
  });
  window.addEventListener('message', (e) => {
    if (e.origin !== ORIGIN || (e.data as { type?: string })?.type !== 'resize') return;
    if (e.source !== frame()?.contentWindow) return;
    document.querySelector('[data-c-stage]')?.closest('.comments')?.setAttribute('data-ready', '');
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
