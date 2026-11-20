/** Bottom-Dock visual labels live outside its horizontal scroll clipping box. */
export function refreshDockTooltip(dock: HTMLElement): void {
  const tip = dock.querySelector<HTMLElement>('[data-dock-floating-tip]');
  const list = dock.querySelector<HTMLElement>('[data-dock-list]');
  if (!tip || !list) return;
  const focused = dock.ownerDocument.activeElement?.closest<HTMLElement>('.dock-btn');
  const button = focused && dock.contains(focused) ? focused : dock.querySelector<HTMLElement>('.is-hover .dock-btn');
  if (!button || button.getAttribute('aria-expanded') === 'true') {
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
