/** Bottom-Dock visual labels live outside its horizontal scroll clipping box. */

let lastPointer: { x: number; y: number } | null = null;

export function noteDockPointer(x: number, y: number): void {
  lastPointer = { x, y };
}

export function clearDockPointer(): void {
  lastPointer = null;
}

export function pointerIsOnItem(item: Element | null): boolean {
  if (!item) return false;
  if (lastPointer != null) {
    const hit = item.ownerDocument.elementFromPoint(lastPointer.x, lastPointer.y);
    return !!hit && (item === hit || item.contains(hit));
  }
  try {
    return item.matches(':hover');
  } catch {
    return false;
  }
}

function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    /* Some test documents do not implement :focus-visible. */
    return el.ownerDocument.activeElement === el;
  }
}

function syncDockTipRootFlags(dock: HTMLElement, item: Element | null): void {
  dock.classList.toggle('is-tip-pointer-suppressed', !!item?.classList.contains('is-tip-pointer-suppressed'));
  dock.classList.toggle('is-tip-focus-suppressed', !!item?.classList.contains('is-tip-focus-suppressed'));
}

export function setDockTipSuppression(
  dock: HTMLElement,
  item: Element | null,
  channels: { pointer?: boolean; focus?: boolean },
): void {
  if (item) {
    if (channels.pointer != null) item.classList.toggle('is-tip-pointer-suppressed', channels.pointer);
    if (channels.focus != null) item.classList.toggle('is-tip-focus-suppressed', channels.focus);
  }
  const focused = dock.ownerDocument.activeElement?.closest?.('.dock-btn');
  const source =
    (focused && dock.contains(focused) ? focused.closest('.dock-item') : null) ||
    dock.querySelector('.is-hover') ||
    item;
  syncDockTipRootFlags(dock, source);
  refreshDockTooltip(dock);
}

export function afterWeatherPanelClose(
  dock: HTMLElement,
  item: Element | null,
  opts: { pointerOnItem: boolean; suppressFocus: boolean },
): void {
  if (item && !opts.pointerOnItem) item.classList.remove('is-hover');
  setDockTipSuppression(dock, item, { pointer: opts.pointerOnItem, focus: opts.suppressFocus });
}

export function refreshDockTooltip(dock: HTMLElement): void {
  const tip = dock.querySelector<HTMLElement>('[data-dock-floating-tip]');
  const list = dock.querySelector<HTMLElement>('[data-dock-list]');
  if (!tip || !list) return;
  const focused = dock.ownerDocument.activeElement?.closest<HTMLElement>('.dock-btn');
  const focusedBtn = focused && dock.contains(focused) ? focused : null;
  const hoverBtn = dock.querySelector<HTMLElement>('.is-hover .dock-btn');

  let button: HTMLElement | null = null;
  if (focusedBtn && focusedBtn.getAttribute('aria-expanded') !== 'true') {
    const item = focusedBtn.closest('.dock-item');
    if (!item?.classList.contains('is-tip-focus-suppressed') && isFocusVisible(focusedBtn)) button = focusedBtn;
  }
  if (!button && hoverBtn && hoverBtn.getAttribute('aria-expanded') !== 'true') {
    const item = hoverBtn.closest('.dock-item');
    if (!item?.classList.contains('is-tip-pointer-suppressed')) button = hoverBtn;
  }

  const sourceItem = (button ?? focusedBtn ?? hoverBtn)?.closest('.dock-item') ?? null;
  syncDockTipRootFlags(dock, sourceItem);

  if (!button) {
    tip.classList.remove('on');
    return;
  }
  const rect = button.getBoundingClientRect(),
    clip = list.getBoundingClientRect(),
    outer = dock.getBoundingClientRect();
  const center = rect.left + rect.width / 2;
  if (center < clip.left || center > clip.right) {
    tip.classList.remove('on');
    return;
  }
  tip.textContent = button.getAttribute('aria-label') ?? '';
  const half = tip.offsetWidth / 2;
  tip.style.left = `${Math.max(half, Math.min(center - outer.left, outer.width - half))}px`;
  tip.classList.toggle('on', !!tip.textContent);
}
