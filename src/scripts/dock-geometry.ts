/** Place the mobile active dot in the clipped, scrollable Dock viewport. */
export function dockDotPosition(center: number, scrollLeft: number, inset: number, size: number, viewport: number) {
  const visibleCenter = center - scrollLeft;
  return {
    x: visibleCenter - size / 2 + inset,
    visible: visibleCenter >= size / 2 && visibleCenter <= viewport - size / 2,
  };
}
