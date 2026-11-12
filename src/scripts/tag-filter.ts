/**
 * 标签筛选行（components/TagFilter.astro）：让「切换筛选」像在同一页里完成。
 * - 点击即把当前项切到被点的胶囊（不等新页面）；
 * - 跳转后以筛选行为锚点恢复滚动：筛选行在视口里的位置不变（Astro 默认会回到顶部）；
 * - 窄屏横向滚动的位置也保持不变。
 * 页头与筛选行在两页间配对且不做淡入淡出，见 styles/motion.css 的 .vt-static。
 */
import { taxonomy } from '../config/content';
import { stripLang } from '../utils/path';
import { once } from './runtime';

const SEL = '[data-tag-filter]';
const LIST_ATTR = 'data-vt-list';
/** 带筛选行的列表页：文章列表与单个标签页 */
const isListPath = (pathname: string) => {
  const p = stripLang(pathname);
  return p === '/posts/' || (p.startsWith(taxonomy.base) && p !== taxonomy.base);
};
let anchor: { top: number; left: number } | null = null;

if (once('tag-filter')) {
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>(`${SEL} a[data-filter]`);
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const nav = a.closest<HTMLElement>(SEL)!;
      nav.querySelectorAll('a[aria-current]').forEach((x) => x.removeAttribute('aria-current'));
      a.setAttribute('aria-current', 'page');
      anchor = { top: nav.getBoundingClientRect().top, left: nav.scrollLeft };
    },
    { capture: true },
  ); // 捕获阶段：先于 ClientRouter 的点击处理（它会 preventDefault 并开始跳转）
  document.addEventListener('astro:before-preparation', (e) => {
    const ev = e as Event & { sourceElement?: Element; from: URL; to: URL };
    // 不是从筛选行发起的跳转（Dock、后退等）不做锚定
    if (!ev.sourceElement?.closest?.(`${SEL} a[data-filter]`)) anchor = null;
    // 列表 ↔ 列表：旧页快照前就关掉标题形变（新页在 before-swap 里同样标记）
    const listToList = isListPath(ev.from.pathname) && isListPath(ev.to.pathname);
    document.documentElement.toggleAttribute(LIST_ATTR, listToList);
  });
  document.addEventListener('astro:before-swap', (e) => {
    const ev = e as Event & { newDocument: Document; viewTransition?: ViewTransition };
    if (!document.documentElement.hasAttribute(LIST_ATTR)) return;
    ev.newDocument.documentElement.setAttribute(LIST_ATTR, '');
    const clear = () => document.documentElement.removeAttribute(LIST_ATTR);
    if (ev.viewTransition) ev.viewTransition.finished.then(clear, clear);
    else requestAnimationFrame(clear);
  });
  document.addEventListener('astro:after-swap', () => {
    const nav = document.querySelector<HTMLElement>(SEL);
    if (anchor && nav) {
      const top = nav.getBoundingClientRect().top + window.scrollY - anchor.top;
      window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'instant' });
      nav.scrollLeft = anchor.left;
    }
    anchor = null;
  });
}
