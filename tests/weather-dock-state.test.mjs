import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { bindWeather } from '../src/scripts/weather/controller.ts';
import { createWeatherService } from '../src/scripts/weather/service.ts';
import { dockWeatherIcon } from '../src/scripts/weather/dock-icons.ts';
import { createWeatherDock } from '../src/scripts/weather/dock-state.ts';
const current = {
  provider: 'weatherapi',
  temperature: 18,
  code: 1000,
  isDay: true,
  high: 21,
  low: 14,
  time: Math.floor(Date.now() / 1000),
  timezone: 'Asia/Shanghai',
  humidity: 60,
  windKph: 12,
  windDegree: 90,
};
const tick = () => new Promise((r) => setTimeout(r, 0));
const normalized = (svg) => parseHTML(`<div>${svg}</div>`).document.querySelector('div').innerHTML;
function setup({ weather = async () => current, service, stored = null } = {}) {
  const { document, window } = parseHTML(
    `<html data-lang="zh"><body><nav data-dock><span data-dock-floating-tip></span><ul data-dock-list><li><button data-weather-toggle class="dock-btn" aria-expanded="false" data-label-zh="天气" data-label-en="Weather" aria-label="天气">${dockWeatherIcon()}</button><span class="dock-tip">天气</span></li><li><button data-theme-toggle><svg id="theme-sun"></svg></button></li></ul></nav><section id="weather-panel" hidden></section></body></html>`,
  );
  window.HTMLElement.prototype.focus = function () {
    document._active = this;
  };
  Object.defineProperty(document, 'activeElement', { get: () => document._active });
  window.innerWidth = 800;
  const requests = { weather: 0, search: 0, locate: 0, writes: 0 };
  bindWeather({
    document,
    window,
    service: service ?? {
      search: async (query) => {
        requests.search++;
        return [
          {
            name: query,
            latitude: query === '北京' ? 39.9 : 51.5,
            longitude: query === '北京' ? 116.4 : -0.12,
            detail: 'region',
          },
        ];
      },
      weather: async (...args) => {
        requests.weather++;
        return weather(...args);
      },
    },
    geolocation: {
      getCurrentPosition() {
        requests.locate++;
      },
    },
    storage: {
      getItem: () => stored,
      setItem() {
        requests.writes++;
      },
      removeItem() {
        requests.writes++;
      },
    },
  });
  const click = (selector) => {
    const el = document.querySelector(selector);
    assert.ok(el, selector);
    el.dispatchEvent(new window.Event('click', { bubbles: true }));
  };
  const event = (type) => document.dispatchEvent(new window.Event(type));
  const button = () => document.querySelector('[data-weather-toggle]');
  const glyph = () => button().innerHTML;
  const open = () => {
    click('[data-weather-toggle]');
  };
  const select = async (name) => {
    if (!document.querySelector('input')) click('[data-weather-action="manual"]');
    document.querySelector('input').value = name;
    document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await tick();
    click('[data-weather-city]');
    await tick();
  };
  return { document, window, requests, click, event, button, glyph, open, select };
}
const expectGlyph = (s, key) => assert.equal(s.glyph(), normalized(dockWeatherIcon(key)));
test('neutral SSR/initialization and first open do not request weather/location or change theme', () => {
  const s = setup(),
    theme = s.document.querySelector('[data-theme-toggle]').innerHTML;
  expectGlyph(s, 'unknown');
  s.open();
  expectGlyph(s, 'unknown');
  assert.equal(s.button().getAttribute('aria-label'), '天气');
  assert.deepEqual(s.requests, { weather: 0, search: 0, locate: 0, writes: 0 });
  assert.equal(s.document.querySelector('[data-theme-toggle]').innerHTML, theme);
  assert.equal(s.button().hasAttribute('aria-current'), false);
});
for (const isDay of [true, false])
  test(`successful clear ${isDay ? 'day' : 'night'} updates Dock and both localized labels atomically`, async () => {
    const s = setup({ weather: async () => ({ ...current, isDay }) });
    s.open();
    await s.select('北京');
    expectGlyph(s, isDay ? 'sun' : 'moon');
    assert.equal(s.button().getAttribute('aria-label'), '北京 · 晴 · 天气');
    assert.equal(s.button().dataset.labelEn, isDay ? '北京 · Sunny · Weather' : '北京 · Clear · Weather');
    assert.equal(s.document.querySelector('.dock-tip').textContent, '北京 · 晴 · 天气');
  });
test('pending new city keeps old successful pair, failure falls back, retry updates only on success', async () => {
  let fail,
    attempt = 0;
  const s = setup({
    weather: async (place) => {
      if (place.name === '北京') return current;
      if (++attempt === 1)
        return new Promise((_ok, reject) => {
          fail = reject;
        });
      return { ...current, code: 1189 };
    },
  });
  s.open();
  await s.select('北京');
  await s.select('London');
  expectGlyph(s, 'sun');
  assert.match(s.button().getAttribute('aria-label'), /^北京/);
  assert.equal(s.button().getAttribute('aria-label').includes('London'), false);
  fail(Error('offline'));
  await tick();
  expectGlyph(s, 'unknown');
  assert.equal(s.button().getAttribute('aria-label'), '天气暂不可用');
  s.click('[data-weather-action="retry"]');
  await tick();
  expectGlyph(s, 'rain');
  assert.match(s.button().getAttribute('aria-label'), /^London · 中雨/);
});
test('successful snapshot survives ClientRouter navigation and language synchronization without requests', async () => {
  const s = setup();
  s.open();
  await s.select('北京');
  const before = { ...s.requests };
  s.event('astro:before-preparation');
  s.document.documentElement.dataset.lang = 'en';
  s.button().setAttribute('aria-label', 'Weather');
  s.document.querySelector('.dock-tip').textContent = 'Weather';
  s.event('astro:after-swap');
  s.event('astro:page-load');
  expectGlyph(s, 'sun');
  assert.equal(s.button().getAttribute('aria-label'), '北京 · Sunny · Weather');
  assert.equal(s.document.querySelector('.dock-tip').textContent, '北京 · Sunny · Weather');
  assert.deepEqual(s.requests, before);
  s.document.documentElement.dataset.lang = 'zh';
  s.event('astro:after-swap');
  assert.equal(s.button().getAttribute('aria-label'), '北京 · 晴 · 天气');
});
test('out-of-order or navigation-canceled success cannot roll back the Dock snapshot', async () => {
  const pending = [];
  const s = setup({ weather: (place) => new Promise((resolve) => pending.push({ name: place.name, resolve })) });
  s.open();
  await s.select('北京');
  await s.select('London');
  pending[1].resolve({ ...current, code: 1225 });
  await tick();
  expectGlyph(s, 'snow');
  assert.match(s.button().getAttribute('aria-label'), /^London/);
  pending[0].resolve(current);
  await tick();
  expectGlyph(s, 'snow');
  assert.match(s.button().getAttribute('aria-label'), /^London/);
  await s.select('北京');
  s.event('astro:before-preparation');
  pending[2].resolve(current);
  await tick();
  expectGlyph(s, 'snow');
  assert.match(s.button().getAttribute('aria-label'), /^London/);
});
test('unknown code is neutral with honest localized conditions rather than fake clear sky', async () => {
  const s = setup({ weather: async () => ({ ...current, code: 999 }) });
  s.open();
  await s.select('北京');
  expectGlyph(s, 'unknown');
  assert.equal(s.button().getAttribute('aria-label'), '北京 · 天气未知 · 天气');
});
test('existing real service cache is used on reopen and refreshed only on expired open; reload stays neutral', async () => {
  let now = 0,
    fetches = 0;
  const service = createWeatherService({
    now: () => now,
    fetcher: async () => ({
      ok: true,
      json: async () => {
        fetches++;
        return {
          provider: 'weatherapi',
          weather: {
            provider: 'weatherapi',
            temperature: 18,
            code: fetches === 1 ? 1000 : 1183,
            isDay: true,
            high: 21,
            low: 14,
            time: Math.floor(Date.now() / 1000),
            timezone: 'Asia/Shanghai',
            humidity: 60,
            windKph: 12,
            windDegree: 90,
          },
        };
      },
    }),
  });
  const stored = JSON.stringify({ name: '北京', latitude: 39.9, longitude: 116.4 });
  const s = setup({ service, stored });
  expectGlyph(s, 'unknown');
  assert.equal(fetches, 0);
  s.open();
  await tick();
  expectGlyph(s, 'sun');
  assert.equal(fetches, 1);
  s.open();
  s.open();
  await tick();
  expectGlyph(s, 'sun');
  assert.equal(fetches, 1);
  s.open();
  now = 600001;
  assert.equal(fetches, 1, 'no polling or closed-panel refresh');
  s.open();
  await tick();
  expectGlyph(s, 'rain');
  assert.equal(fetches, 2);
  const fresh = setup({ service, stored });
  expectGlyph(fresh, 'unknown');
  assert.equal(fetches, 2, 'full reload does not eagerly fetch remembered city');
});

test('dock snapshot of an observation older than 60 minutes is cleared on sync without fetching', async () => {
  let now = 1_795_146_300_000;
  const { document } = parseHTML(
    `<html data-lang="zh"><body><nav data-dock><span data-dock-floating-tip></span><ul data-dock-list><li><button data-weather-toggle class="dock-btn" aria-expanded="false" data-label-zh="天气" data-label-en="Weather" aria-label="天气"></button><span class="dock-tip">天气</span></li></ul></nav></body></html>`,
  );
  const dock = createWeatherDock(document, { now: () => now });
  dock.success({ name: '上海', latitude: 31.23, longitude: 121.47 }, { ...current, time: 1_795_146_300 });
  assert.match(document.querySelector('[data-weather-toggle]').getAttribute('aria-label'), /^上海/);
  now += 60 * 60 * 1000 + 1;
  dock.sync();
  assert.equal(document.querySelector('[data-weather-toggle]').getAttribute('aria-label'), '天气');
});
