/** Exercise the actual Dock binding without a browser, CSS engine or network. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { parseHTML } from 'linkedom';
import * as dockTooltip from '../src/scripts/dock-tooltip.ts';
import { dockMotion } from '../src/config/motion.ts';

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL('../src/scripts/dock.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup() {
  const { document, window: dom } = parseHTML(`<html data-lang="zh"><body><nav data-dock>
    <div data-dock-list><div class="dock-item" id="weather"><button class="dock-btn" aria-expanded="false" data-label-zh="天气"></button><span class="dock-tip">天气</span></div>
    <div class="dock-item"><a class="dock-btn" id="language" href="/en/" data-label-zh="English">EN</a></div></div>
    <span data-dock-floating-tip></span></nav><main id="outside"></main></body></html>`);
  const media = { matches: true, addEventListener() {} };
  const window = { matchMedia: () => media, addEventListener() {} };
  const frames = [],
    registrations = new Map();
  const add = document.addEventListener.bind(document);
  document.addEventListener = (type, ...args) => {
    registrations.set(type, (registrations.get(type) ?? 0) + 1);
    add(type, ...args);
  };
  Object.defineProperty(document, 'activeElement', { value: null, writable: true });
  document.elementFromPoint = () => document.querySelector('#outside');
  const dependencies = {
    './dock-geometry': { dockDotPosition: () => null },
    './dock-tooltip': dockTooltip,
    '../config/nav': { isNavActive: () => false },
    '../config/locales': {
      defaultLang: 'zh',
      langs: ['zh', 'en'],
      locales: { zh: { html: 'zh-CN', short: '中' }, en: { html: 'en', short: 'EN' } },
      otherLang: (l) => (l === 'zh' ? 'en' : 'zh'),
    },
    '../config/motion': { dockMotion },
    '../utils/path': { stripLang: (p) => p },
    './controls': { bindControls() {} },
    './runtime': { once: () => true, prefersReducedMotion: () => true },
  };
  vm.runInNewContext(source, {
    document,
    window,
    exports: {},
    location: { pathname: '/' },
    queueMicrotask,
    requestAnimationFrame: (callback) => {
      frames.push(callback);
      return frames.length;
    },
    performance: { now: () => 0 },
    require: (name) =>
      name === './dock-navigation' ? require('../src/scripts/dock-navigation.ts') : dependencies[name],
  });
  const fire = (target, type, properties = {}) => {
    const event = new dom.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, properties);
    target.dispatchEvent(event);
    return event;
  };
  fire(document, 'astro:page-load');
  const dock = document.querySelector('[data-dock]'),
    item = document.querySelector('#weather');
  const prepare = (signal = new AbortController().signal, loader = async () => {}) =>
    fire(document, 'astro:before-preparation', { to: new URL('https://hychiiu.com/posts/'), signal, loader });
  const swap = (signal, finished) =>
    fire(document, 'astro:before-swap', { signal, viewTransition: finished ? { finished } : undefined });
  const hover = () => fire(item.querySelector('button'), 'pointerover', { pointerType: 'mouse' });
  return { document, dock, item, frames, registrations, fire, prepare, swap, hover, state: window.__yhDock };
}

test('aborted preparation without swap releases navigation and stale hover', async () => {
  const s = setup(),
    controller = new AbortController();
  s.hover();
  s.prepare(controller.signal);
  s.fire(s.dock, 'pointerleave', { pointerType: 'mouse' });
  s.fire(s.document.querySelector('#outside'), 'pointermove', { pointerType: 'mouse', clientX: 600, clientY: 300 });
  controller.abort();
  await tick();
  assert.equal(s.state.navigating, false);
  assert.equal(s.item.classList.contains('is-hover'), false);
  s.hover();
  assert.equal(s.item.classList.contains('is-hover'), true);
});

test('aborted preparation without any recorded pointer drops an untrusted mirror', async () => {
  const s = setup(),
    controller = new AbortController();
  s.hover();
  s.prepare(controller.signal);
  controller.abort();
  await tick();
  assert.equal(s.state.navigating, false);
  assert.equal(s.item.classList.contains('is-hover'), false);
});

test('preparation prevented by a later listener releases navigation', async () => {
  const s = setup();
  s.document.addEventListener('astro:before-preparation', (event) => event.preventDefault());
  s.prepare();
  await tick();
  assert.equal(s.state.navigating, false);
});

test('loader cancellation preserves Router behavior and releases navigation', async () => {
  const s = setup();
  const prevented = s.prepare(undefined, function () {
    this.preventDefault();
  });
  await prevented.loader();
  assert.equal(prevented.defaultPrevented, true);
  assert.equal(s.state.navigating, false);
});

test('loader rejection preserves the same error and releases navigation', async () => {
  const s = setup();
  const error = new Error('synthetic loader failure');
  const failed = s.prepare(undefined, async () => {
    throw error;
  });
  await assert.rejects(failed.loader(), (value) => value === error);
  assert.equal(s.state.navigating, false);
});

test('already-aborted preparation cannot leave the navigating flag set', async () => {
  const s = setup(),
    controller = new AbortController();
  controller.abort();
  s.prepare(controller.signal);
  await tick();
  assert.equal(s.state.navigating, false);
});

test('older transition completion or abort cannot release a newer preparation', async () => {
  const s = setup(),
    first = new AbortController(),
    second = new AbortController(),
    oldTransition = deferred();
  s.prepare(first.signal);
  s.swap(first.signal, oldTransition.promise);
  s.prepare(second.signal);
  first.abort();
  oldTransition.resolve();
  await tick();
  assert.equal(s.state.navigating, true);
  second.abort();
  await tick();
  assert.equal(s.state.navigating, false);
});

test('current transition completion releases once; rejection also discards stale hover', async () => {
  const s = setup(),
    first = new AbortController(),
    success = deferred();
  s.prepare(first.signal);
  s.swap(first.signal, success.promise);
  success.resolve();
  await tick();
  assert.equal(s.state.navigating, false);
  const next = new AbortController(),
    failed = deferred();
  s.hover();
  s.prepare(next.signal);
  s.swap(next.signal, failed.promise);
  failed.reject(new Error('synthetic transition failure'));
  await tick();
  assert.equal(s.state.navigating, false);
  assert.equal(s.item.classList.contains('is-hover'), false);
});

test('fallback frame respects navigation identity and page-load does not end a live transition', async () => {
  const s = setup(),
    first = new AbortController(),
    second = new AbortController();
  s.prepare(first.signal);
  s.swap(first.signal);
  const previousFrame = s.frames.at(-1);
  s.prepare(second.signal);
  previousFrame();
  assert.equal(s.state.navigating, true);
  s.fire(s.document, 'astro:page-load');
  assert.equal(s.state.navigating, true);
  s.swap(second.signal);
  s.frames.at(-1)();
  assert.equal(s.state.navigating, false);
});

test('repeated page-load retains a single Dock lifecycle binding', () => {
  const s = setup();
  s.fire(s.document, 'astro:page-load');
  s.fire(s.document, 'astro:page-load');
  assert.equal(s.registrations.get('astro:before-preparation'), 1);
  assert.equal(s.registrations.get('astro:before-swap'), 1);
});

test('navigation abort listeners are removed on supersession and completion', async () => {
  const s = setup(),
    first = new AbortController(),
    second = new AbortController();
  let added = 0,
    removed = 0;
  const add = first.signal.addEventListener.bind(first.signal),
    remove = first.signal.removeEventListener.bind(first.signal);
  first.signal.addEventListener = (...args) => {
    added++;
    return add(...args);
  };
  first.signal.removeEventListener = (...args) => {
    removed++;
    return remove(...args);
  };
  s.prepare(first.signal);
  s.prepare(second.signal);
  assert.equal(added, 1);
  assert.equal(removed, 1);
  second.abort();
  await tick();
  assert.equal(s.state.navigating, false);
});
