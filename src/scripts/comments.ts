/**
 * 评论区客户端：主题同步、utterances 就绪后收起静态列表、「在本页留言」按需加载 utterances。
 */
import { comments } from '../config/integrations';
import { once } from './runtime';

const { origin: ORIGIN, theme: THEMES } = comments.utterances;
const theme = () => (document.documentElement.dataset.theme === 'dark' ? THEMES.dark : THEMES.light);
if (once('comments')) {
  // 主题切换时同步 utterances
  window.addEventListener('themechange', () => {
    const frame = document.querySelector<HTMLIFrameElement>('iframe.utterances-frame');
    frame?.contentWindow?.postMessage({ type: 'set-theme', theme: theme() }, ORIGIN);
  });
  // utterances 就绪（首次 resize 消息）后收起静态列表，避免重复
  window.addEventListener('message', (e) => {
    if (e.origin !== ORIGIN || (e.data as { type?: string })?.type !== 'resize') return;
    document.querySelector('[data-static-comments]')?.setAttribute('hidden', '');
  });
  // 「在本页留言」：按需挂载 utterances
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-utterances-load]');
    const slot = document.querySelector<HTMLElement>('[data-utterances]');
    if (!btn || !slot || slot.childElementCount) return;
    btn.hidden = true;
    slot.hidden = false;
    const s = document.createElement('script');
    s.src = `${ORIGIN}/client.js`;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('repo', slot.dataset.repo!);
    s.setAttribute('issue-number', slot.dataset.issue!);
    s.setAttribute('theme', theme());
    slot.appendChild(s);
  });
}
