/**
 * 轻量缩放 / 平移（无依赖，只改 transform）。用于 Mermaid 图与其全屏灯箱。
 *
 * - 文内：Ctrl/⌘ + 滚轮（含触控板双指捏合）缩放，鼠标拖拽平移，双击复位；
 *   普通滚轮不拦截，保证文章正常滚动；触屏单指仍滚动页面。
 * - 灯箱（free 模式）：滚轮直接缩放，单指拖拽、双指捏合。
 */
export interface PanZoom {
  zoomBy(factor: number): void;
  reset(): void;
  destroy(): void;
}

const MIN = 0.5;
const MAX = 5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function panZoom(viewport: HTMLElement, content: HTMLElement, { free = false } = {}): PanZoom {
  let x = 0;
  let y = 0;
  let s = 1;
  const pts = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; s: number } | null = null;

  content.style.transformOrigin = '0 0';
  viewport.style.touchAction = free ? 'none' : 'pan-x pan-y';

  const apply = (animate: boolean) => {
    content.style.transition = animate ? 'transform var(--dur-2) var(--ease)' : 'none';
    content.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
    viewport.toggleAttribute('data-zoomed', Math.abs(s - 1) > 0.001 || Math.abs(x) > 0.5 || Math.abs(y) > 0.5);
  };

  /** 以视口内坐标 (px, py) 为中心缩放 */
  const zoomAt = (next: number, px: number, py: number, animate: boolean) => {
    next = clamp(next, MIN, MAX);
    // content 未变换时相对视口的偏移（居中布局时不为 0）
    x = px - (px - x) * (next / s);
    y = py - (py - y) * (next / s);
    s = next;
    apply(animate);
  };
  const local = (e: { clientX: number; clientY: number }) => {
    const r = viewport.getBoundingClientRect();
    const c = content.getBoundingClientRect();
    // 以 content 的未变换原点为参照：原点 = 当前左上角 - 平移
    const ox = c.left - r.left - x;
    const oy = c.top - r.top - y;
    return { px: e.clientX - r.left - ox, py: e.clientY - r.top - oy };
  };

  const onWheel = (e: WheelEvent) => {
    if (!free && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const { px, py } = local(e);
    // 触控板捏合给出很小的 deltaY，鼠标滚轮一格约 100：限幅后每格约 ×1.3
    const d = clamp(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, -25, 25);
    zoomAt(s * Math.exp(-d * 0.01), px, py, false);
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (!free && e.pointerType === 'touch') return;
    if ((e.target as Element).closest('button, a')) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewport.setPointerCapture(e.pointerId);
    viewport.dataset.dragging = '';
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s };
    }
  };
  const onMove = (e: PointerEvent) => {
    const prev = pts.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, cur);
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const { px, py } = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      zoomAt((pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d, px, py, false);
      return;
    }
    x += cur.x - prev.x;
    y += cur.y - prev.y;
    apply(false);
  };
  const onUp = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (!pts.size) delete viewport.dataset.dragging;
  };
  const reset = () => {
    x = 0;
    y = 0;
    s = 1;
    apply(true);
  };

  viewport.addEventListener('wheel', onWheel, { passive: false });
  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);
  viewport.addEventListener('dblclick', reset);

  return {
    zoomBy(f) {
      const r = viewport.getBoundingClientRect();
      const { px, py } = local({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
      zoomAt(s * f, px, py, true);
    },
    reset,
    destroy() {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onDown);
      viewport.removeEventListener('pointermove', onMove);
      viewport.removeEventListener('pointerup', onUp);
      viewport.removeEventListener('pointercancel', onUp);
      viewport.removeEventListener('dblclick', reset);
    },
  };
}
