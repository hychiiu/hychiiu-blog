import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { readFileSync } from 'node:fs';
import {
  refreshDockTooltip,
  setDockTipSuppression,
  afterWeatherPanelClose,
  noteDockPointer,
  clearDockPointer,
  pointerIsOnItem,
} from '../src/scripts/dock-tooltip.ts';
function setup() {
  clearDockPointer();
  const { document } = parseHTML(
    '<nav data-dock><span class="dock-floating-tip" data-dock-floating-tip aria-hidden="true"></span><ul data-dock-list><li class="dock-item is-hover" id="weather-item"><button class="dock-btn" data-weather-toggle aria-expanded="false" aria-label="天气"></button><span class="dock-tip">天气</span></li><li class="dock-item" id="lang-item"><a class="dock-btn" id="language" aria-label="English"></a><span class="dock-tip">English</span></li></ul></nav><button id="outside">out</button>',
  );
  const dock = document.querySelector('nav'),
    tip = document.querySelector('[data-dock-floating-tip]'),
    button = document.querySelector('button'),
    list = document.querySelector('ul');
  dock.getBoundingClientRect = () => ({ left: 12, right: 308, width: 296 });
  list.getBoundingClientRect = () => ({ left: 16, right: 304, width: 288 });
  button.getBoundingClientRect = () => ({ left: 170, right: 208, width: 38 });
  const langBtn = document.querySelector('#language');
  langBtn.getBoundingClientRect = () => ({ left: 220, right: 258, width: 38 });
  Object.defineProperty(tip, 'offsetWidth', { value: 80 });
  Object.defineProperty(document, 'activeElement', { value: null, writable: true });
  const item = document.querySelector('#weather-item');
  const lang = document.querySelector('#language');
  return { document, dock, tip, button, list, item, lang };
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
  const rootRule = css.match(
    /\.dock\.is-tip-pointer-suppressed\s+\.dock-floating-tip\s*,\s*\.dock\.is-tip-focus-suppressed\s+\.dock-floating-tip\s*\{[^}]*\}/,
  );
  assert.ok(rootRule, 'root suppression rule must exist for instant hide');
  assert.match(rootRule[0], /transition:\s*none/);
  assert.doesNotMatch(rootRule[0], /opacity:\s*0/, 'a single root channel must not veto .on from the other channel');
  assert.match(css, /\.dock-floating-tip\.on\s*\{[^}]*opacity:\s*1/);
});
test('keyboard focus drives text, scrolling updates coordinates and hides offscreen control', () => {
  const s = setup();
  s.document.querySelector('li').classList.remove('is-hover');
  s.document.activeElement = s.button;
  const orig = s.button.matches.bind(s.button);
  s.button.matches = (sel) => (sel === ':focus-visible' ? true : orig(sel));
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

test('pointer and focus suppression are independent and synced to item and Dock root', () => {
  const s = setup();
  setDockTipSuppression(s.dock, s.item, { pointer: true, focus: false });
  assert.equal(s.item.classList.contains('is-tip-pointer-suppressed'), true);
  assert.equal(s.dock.classList.contains('is-tip-pointer-suppressed'), true);
  assert.equal(s.item.classList.contains('is-tip-focus-suppressed'), false);
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), false, 'hover alone must not win over pointer suppression');
  s.document.querySelector('li').classList.remove('is-hover');
  s.document.activeElement = s.lang;
  setDockTipSuppression(s.dock, s.item, { pointer: true, focus: false });
  refreshDockTooltip(s.dock);
  assert.equal(
    s.tip.classList.contains('on'),
    true,
    'language focus must still show when only weather pointer is suppressed',
  );
  assert.equal(s.tip.textContent, 'English');
  assert.equal(s.dock.classList.contains('is-tip-pointer-suppressed'), false);
});

test('toggle close while pointer is on the trigger suppresses both channels without blur', () => {
  const s = setup();
  s.document.activeElement = s.button;
  afterWeatherPanelClose(s.dock, s.item, { pointerOnItem: true, suppressFocus: true });
  assert.equal(s.item.classList.contains('is-hover'), true);
  assert.equal(s.item.classList.contains('is-tip-pointer-suppressed'), true);
  assert.equal(s.item.classList.contains('is-tip-focus-suppressed'), true);
  assert.equal(s.dock.classList.contains('is-tip-pointer-suppressed'), true);
  assert.equal(s.dock.classList.contains('is-tip-focus-suppressed'), true);
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), false);
  assert.equal(s.document.activeElement, s.button);
});

test('Esc close with pointer already outside clears a stale hover mirror', () => {
  const s = setup();
  s.document.activeElement = s.button;
  s.document.elementFromPoint = () => s.document.querySelector('#outside');
  noteDockPointer(600, 300);
  afterWeatherPanelClose(s.dock, s.item, { pointerOnItem: false, suppressFocus: true });
  assert.equal(s.item.classList.contains('is-hover'), false);
  assert.equal(s.item.classList.contains('is-tip-pointer-suppressed'), false);
  assert.equal(s.item.classList.contains('is-tip-focus-suppressed'), true);
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), false);
  s.document.activeElement = s.lang;
  setDockTipSuppression(s.dock, s.item, { focus: false });
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), true);
  assert.equal(s.tip.textContent, 'English');
});

test('matches(:focus-visible) false does not treat mouse focus as focus-visible', () => {
  const s = setup();
  s.item.classList.remove('is-hover');
  s.document.activeElement = s.button;
  const orig = s.button.matches.bind(s.button);
  s.button.matches = (sel) => (sel === ':focus-visible' ? false : orig(sel));
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), false);
});

test('Esc with no lastPointer still suppresses pointer when the item is :hover', () => {
  const s = setup();
  s.document.activeElement = s.button;
  const orig = s.item.matches.bind(s.item);
  s.item.matches = (sel) => (sel === ':hover' ? true : orig(sel));
  assert.equal(pointerIsOnItem(s.item), true);
  afterWeatherPanelClose(s.dock, s.item, { pointerOnItem: pointerIsOnItem(s.item), suppressFocus: true });
  assert.equal(s.item.classList.contains('is-hover'), true);
  assert.equal(s.item.classList.contains('is-tip-pointer-suppressed'), true);
  assert.equal(s.item.classList.contains('is-tip-focus-suppressed'), true);
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), false);
});

test('focus suppression must not hide a pointer-driven floating tip', () => {
  const s = setup();
  s.document.activeElement = s.button;
  const origFocus = s.button.matches.bind(s.button);
  s.button.matches = (sel) => (sel === ':focus-visible' ? false : origFocus(sel));
  afterWeatherPanelClose(s.dock, s.item, { pointerOnItem: false, suppressFocus: true });
  assert.equal(s.item.classList.contains('is-tip-focus-suppressed'), true);
  assert.equal(s.item.classList.contains('is-tip-pointer-suppressed'), false);
  s.item.classList.add('is-hover');
  refreshDockTooltip(s.dock);
  assert.equal(s.tip.classList.contains('on'), true);
  assert.equal(s.tip.textContent, '天气');
});

test('pointer suppression must not hide a focus-visible floating tip', () => {
  const s = setup();
  s.item.classList.remove('is-hover');
  s.document.activeElement = s.button;
  const orig = s.button.matches.bind(s.button);
  s.button.matches = (sel) => (sel === ':focus-visible' ? true : orig(sel));
  setDockTipSuppression(s.dock, s.item, { pointer: true, focus: false });
  refreshDockTooltip(s.dock);
  assert.equal(s.item.classList.contains('is-tip-pointer-suppressed'), true);
  assert.equal(s.item.classList.contains('is-tip-focus-suppressed'), false);
  assert.equal(s.tip.classList.contains('on'), true);
  assert.equal(s.tip.textContent, '天气');
});
