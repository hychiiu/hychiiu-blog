import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { readFileSync } from 'node:fs';
import { refreshDockTooltip } from '../src/scripts/dock-tooltip.ts';
function setup() {
  const { document } = parseHTML(
    '<nav data-dock><span class="dock-floating-tip" data-dock-floating-tip aria-hidden="true"></span><ul data-dock-list><li class="dock-item is-hover"><button class="dock-btn" aria-label="天气"></button><span class="dock-tip">天气</span></li></ul></nav>',
  );
  const dock = document.querySelector('nav'),
    tip = document.querySelector('[data-dock-floating-tip]'),
    button = document.querySelector('button'),
    list = document.querySelector('ul');
  dock.getBoundingClientRect = () => ({ left: 12, right: 308, width: 296 });
  list.getBoundingClientRect = () => ({ left: 16, right: 304, width: 288 });
  button.getBoundingClientRect = () => ({ left: 170, right: 208, width: 38 });
  Object.defineProperty(tip, 'offsetWidth', { value: 80 });
  Object.defineProperty(document, 'activeElement', { value: null, writable: true });
  return { document, dock, tip, button, list };
}
test('bottom tooltip is positioned in outer Dock, not inside scroll clipping ancestor', () => {
  const s = setup();
  refreshDockTooltip(s.dock);
  assert.ok(s.tip.parentElement === s.dock);
  assert.ok(!s.list.contains(s.tip));
  assert.equal(s.tip.textContent, '天气');
  assert.equal(s.tip.style.left, '177px');
  assert.equal(s.tip.classList.contains('on'), true);
  const source = readFileSync(new URL('../src/components/Dock.astro', import.meta.url), 'utf8');
  assert.ok(source.indexOf('data-dock-floating-tip') < source.indexOf('<ul'));
  const css = readFileSync(new URL('../src/styles/dock.css', import.meta.url), 'utf8');
  assert.match(css, /\.dock-floating-tip\.on/);
  assert.match(css, /overflow-y: hidden/);
});
test('keyboard focus drives text, scrolling updates coordinates and hides offscreen control', () => {
  const s = setup();
  s.document.querySelector('li').classList.remove('is-hover');
  s.document.activeElement = s.button;
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), true);
  s.button.setAttribute('aria-label', 'Weather');
  s.button.getBoundingClientRect = () => ({ left: 24, right: 62, width: 38 });
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.textContent, 'Weather');
  assert.equal(s.tip.style.left, '40px');
  s.button.getBoundingClientRect = () => ({ left: -30, right: 8, width: 38 });
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), false);
});
test('opened weather popover suppresses its tooltip; pointer leave without focus closes tooltip', () => {
  const s = setup();
  s.button.setAttribute('aria-expanded', 'true');
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), false);
  s.button.removeAttribute('aria-expanded');
  s.document.querySelector('li').classList.remove('is-hover');
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), false);
});
