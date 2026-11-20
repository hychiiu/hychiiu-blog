import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { bindWeather } from '../src/scripts/weather/controller.ts';
import { renderWeather } from '../src/scripts/weather/view.ts';
import { weatherIcon } from '../src/scripts/weather/icons.ts';
import { dockWeatherIcon } from '../src/scripts/weather/dock-icons.ts';
const weather = {
  temperature: 18.2,
  code: 2,
  isDay: true,
  high: 21,
  low: 14,
  time: 1795146300,
  timezone: 'Asia/Shanghai',
};
const city = { name: '北京', detail: '北京市 · 中国', latitude: 39.9, longitude: 116.4, id: 1 };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function setup(overrides = {}) {
  const { document, window } = parseHTML(
    '<html data-lang="zh"><body><nav data-dock><button data-weather-toggle aria-expanded="false" aria-controls="weather-panel">天气</button></nav><section id="weather-panel" hidden role="dialog" aria-labelledby="weather-title"></section><button id="outside">out</button></body></html>',
  );
  window.HTMLElement.prototype.focus = function () {
    document._active = this;
  };
  Object.defineProperty(document, 'activeElement', { get: () => document._active, configurable: true });
  window.innerHeight = 800;
  window.innerWidth = 1200;
  const calls = { weather: 0, search: 0, locate: 0, writes: [] };
  const storage = { getItem: () => null, setItem: (...x) => calls.writes.push(x), removeItem: () => {} };
  const service = {
    weather: async () => {
      calls.weather++;
      return weather;
    },
    search: async () => {
      calls.search++;
      return [city];
    },
    ...overrides.service,
  };
  const geo = {
    getCurrentPosition(_ok, fail) {
      calls.locate++;
      fail({ code: 1 });
    },
    ...overrides.geo,
  };
  const host = { document, window, service, geolocation: geo, storage: overrides.storage ?? storage };
  bindWeather(host);
  const click = (sel) => {
    const el = document.querySelector(sel);
    assert.ok(el, sel);
    el.dispatchEvent(new window.Event('click', { bubbles: true }));
  };
  const event = (type) => document.dispatchEvent(new window.Event(type));
  const search = async () => {
    click('[data-weather-toggle]');
    click('[data-weather-action="manual"]');
    document.querySelector('input').value = '北京';
    document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await tick();
  };
  return { document, window, calls, click, event, search, host };
}
test('first open is consent-first, no network or geolocation, bindings idempotent', () => {
  const s = setup();
  bindWeather(s.host);
  s.click('[data-weather-toggle]');
  assert.equal(s.document.querySelector('#weather-panel').hidden, false);
  assert.equal(s.calls.locate, 0);
  assert.equal(s.calls.weather, 0);
  assert.equal(s.calls.search, 0);
  assert.match(s.document.querySelector('#weather-panel').textContent, /看看你那里的天气/);
  assert.equal(s.document.querySelector('[data-weather-toggle]').getAttribute('aria-expanded'), 'true');
  s.event('pointerleave');
  assert.equal(s.document.querySelector('#weather-panel').hidden, false);
});
test('explicit location rejection gives clear manual fallback without storage', async () => {
  const s = setup();
  s.click('[data-weather-toggle]');
  s.click('[data-weather-action="locate"]');
  await tick();
  assert.equal(s.calls.locate, 1);
  assert.match(s.document.querySelector('#weather-panel').textContent, /定位未获允许/);
  s.click('[data-weather-action="manual"]');
  assert.ok(s.document.querySelector('input'));
  assert.deepEqual(s.calls.writes, []);
});
test('manual candidates are distinguishable and selected weather persists city only', async () => {
  const s = setup();
  await s.search();
  assert.match(s.document.querySelector('[data-weather-city]').textContent, /北京市/);
  s.click('[data-weather-city]');
  await tick();
  assert.equal(s.calls.weather, 1);
  assert.match(s.document.querySelector('#weather-panel').textContent, /18/);
  assert.equal(s.calls.writes.length, 1);
  assert.equal(JSON.parse(s.calls.writes[0][1]).name, '北京');
  assert.equal(s.calls.writes[0][1].includes('temperature'), false);
});
test('location is rounded before API and never persisted', async () => {
  let selected;
  const s = setup({
    geo: {
      getCurrentPosition(ok) {
        ok({ coords: { latitude: 31.234567, longitude: 121.456789 } });
      },
    },
    service: {
      weather: async (p) => {
        selected = p;
        return weather;
      },
    },
  });
  s.click('[data-weather-toggle]');
  s.click('[data-weather-action="locate"]');
  await tick();
  assert.equal(selected.latitude, 31.23);
  assert.equal(selected.longitude, 121.46);
  assert.deepEqual(s.calls.writes, []);
  assert.match(s.document.querySelector('#weather-panel').textContent, /当前位置/);
});
test('Escape/outside close restore focus and ClientRouter closes without fetching', async () => {
  const s = setup();
  s.click('[data-weather-toggle]');
  const key = new s.window.Event('keydown');
  key.key = 'Escape';
  s.document.dispatchEvent(key);
  assert.equal(s.document.querySelector('#weather-panel').hidden, true);
  assert.equal(s.document.activeElement, s.document.querySelector('[data-weather-toggle]'));
  s.click('[data-weather-toggle]');
  s.document.querySelector('#outside').dispatchEvent(new s.window.Event('pointerdown', { bubbles: true }));
  assert.equal(s.document.querySelector('#weather-panel').hidden, true);
  s.click('[data-weather-toggle]');
  s.event('astro:before-preparation');
  s.document.documentElement.dataset.lang = 'en';
  s.event('astro:after-swap');
  s.event('astro:page-load');
  assert.equal(s.document.querySelector('#weather-panel').hidden, true);
  s.click('[data-weather-toggle]');
  assert.match(s.document.querySelector('#weather-panel').textContent, /Weather where you are/);
  assert.equal(s.calls.weather, 0);
});
test('stale geolocation and weather response cannot override a newer search or reopened panel', async () => {
  let resolveWeather, locate;
  const s = setup({
    geo: {
      getCurrentPosition(ok) {
        locate = ok;
      },
    },
    service: {
      weather: () =>
        new Promise((r) => {
          resolveWeather = r;
        }),
    },
  });
  s.click('[data-weather-toggle]');
  s.click('[data-weather-action="locate"]');
  s.click('[data-weather-action="manual"]');
  locate({ coords: { latitude: 1, longitude: 2 } });
  await tick();
  assert.ok(s.document.querySelector('input'));
  s.document.querySelector('input').value = '北京';
  s.document.querySelector('form').dispatchEvent(new s.window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  s.click('[data-weather-city]');
  s.click('[data-weather-action="manual"]');
  resolveWeather(weather);
  await tick();
  assert.ok(s.document.querySelector('input'));
  assert.deepEqual(s.calls.writes, []);
});
test('forecast failure is retryable, rejected location preference does not break fallback', async () => {
  let attempts = 0;
  const s = setup({
    service: {
      weather: async () => {
        if (++attempts === 1) throw Error('offline');
        return weather;
      },
    },
  });
  await s.search();
  s.click('[data-weather-city]');
  await tick();
  assert.match(s.document.querySelector('#weather-panel').textContent, /暂时无法获取天气/);
  s.click('[data-weather-action="retry"]');
  await tick();
  assert.match(s.document.querySelector('#weather-panel').textContent, /18/);
});
test('rendering escapes remote names, supplies attribution, city timezone, and unknown fallback', () => {
  const html = renderWeather(
    { mode: 'weather', place: { ...city, name: '<img src=x onerror=alert(1)>' }, weather: { ...weather, code: 999 } },
    'en',
  );
  assert.equal(html.includes('<img src=x'), false);
  assert.match(html, /Unknown conditions/);
  assert.match(html, /Open-Meteo/);
  assert.match(html, /creativecommons/);
  assert.match(html, /Asia\/Shanghai/);
  assert.match(html, /11:45/);
});

test('asynchronous completion never steals focus from reading outside panel', async () => {
  let resolveWeather;
  const s = setup({
    service: {
      weather: () =>
        new Promise((resolve) => {
          resolveWeather = resolve;
        }),
    },
  });
  await s.search();
  s.click('[data-weather-city]');
  const outside = s.document.querySelector('#outside');
  outside.focus();
  resolveWeather(weather);
  await tick();
  assert.ok(s.document.activeElement === outside, 'focus must stay outside');
});
test('attribution is a visible link and consent copy discloses provider log retention', () => {
  const { document } = parseHTML(renderWeather({ mode: 'weather', place: city, weather }, 'en'));
  const link = document.querySelector('a[href="https://open-meteo.com/"]');
  assert.ok(link);
  assert.ok(link.closest('details') === null, 'attribution must not be collapsed');
  assert.match(renderWeather({ mode: 'choice' }, 'en'), /90 days/);
});

for (const code of [2, 3])
  test(`location error ${code} keeps manual fallback`, async () => {
    const s = setup({
      geo: {
        getCurrentPosition(_ok, fail) {
          fail({ code });
        },
      },
    });
    s.click('[data-weather-toggle]');
    s.click('[data-weather-action="locate"]');
    await tick();
    assert.ok(s.document.querySelector('[data-weather-action="manual"]'));
    assert.match(s.document.querySelector('#weather-panel').textContent, code === 3 ? /定位超时/ : /定位不可用/);
  });
test('stored manual preference is lazy; unavailable local storage is harmless', async () => {
  const s = setup({
    storage: {
      getItem: () => JSON.stringify(city),
      setItem() {
        throw Error('blocked');
      },
      removeItem() {},
    },
  });
  assert.equal(s.calls.weather, 0);
  s.click('[data-weather-toggle]');
  await tick();
  assert.equal(s.calls.weather, 1);
  assert.match(s.document.querySelector('#weather-panel').textContent, /北京/);
  const blocked = setup({
    storage: {
      getItem() {
        throw Error('blocked');
      },
    },
  });
  blocked.click('[data-weather-toggle]');
  assert.match(blocked.document.querySelector('#weather-panel').textContent, /看看你那里的天气/);
});
test('newer city search wins even if older service ignores abort', async () => {
  const pending = [];
  const s = setup({ service: { search: () => new Promise((resolve) => pending.push(resolve)) } });
  s.click('[data-weather-toggle]');
  s.click('[data-weather-action="manual"]');
  const submit = (q) => {
    s.document.querySelector('input').value = q;
    s.document.querySelector('form').dispatchEvent(new s.window.Event('submit', { bubbles: true, cancelable: true }));
  };
  submit('Beijing');
  submit('London');
  pending[1]([{ ...city, name: 'London' }]);
  await tick();
  pending[0]([city]);
  await tick();
  assert.match(s.document.querySelector('[data-weather-city]').textContent, /London/);
});
test('navigation aborts pending request and late completion cannot reopen panel', async () => {
  let resolveWeather, signal;
  const s = setup({
    service: {
      weather: (_p, sig) => {
        signal = sig;
        return new Promise((resolve) => {
          resolveWeather = resolve;
        });
      },
    },
  });
  await s.search();
  s.click('[data-weather-city]');
  s.event('astro:before-preparation');
  assert.equal(signal.aborted, true);
  resolveWeather(weather);
  await tick();
  assert.equal(s.document.querySelector('#weather-panel').hidden, true);
  assert.deepEqual(s.calls.writes, []);
});
test('search failures and no matches are explicit and can be resubmitted', async () => {
  let attempt = 0;
  const s = setup({
    service: {
      search: async () => {
        if (++attempt === 1) throw Error('offline');
        return [];
      },
    },
  });
  await s.search();
  assert.match(s.document.querySelector('#weather-panel').textContent, /暂时无法搜索城市/);
  s.document.querySelector('form').dispatchEvent(new s.window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  assert.match(s.document.querySelector('#weather-panel').textContent, /没有找到城市/);
});

test('late geolocation and search failure do not move focus back from the page', async () => {
  let locate;
  const s = setup({
    geo: {
      getCurrentPosition(ok) {
        locate = ok;
      },
    },
  });
  s.click('[data-weather-toggle]');
  s.click('[data-weather-action="locate"]');
  const outside = s.document.querySelector('#outside');
  outside.focus();
  locate({ coords: { latitude: 1, longitude: 2 } });
  await tick();
  assert.ok(s.document.activeElement === outside, 'late location must not steal focus');
  let rejectSearch;
  const q = setup({
    service: {
      search: () =>
        new Promise((_ok, fail) => {
          rejectSearch = fail;
        }),
    },
  });
  q.click('[data-weather-toggle]');
  q.click('[data-weather-action="manual"]');
  q.document.querySelector('input').value = 'London';
  q.document.querySelector('form').dispatchEvent(new q.window.Event('submit', { bubbles: true, cancelable: true }));
  const out = q.document.querySelector('#outside');
  out.focus();
  rejectSearch(Error('offline'));
  await tick();
  assert.ok(q.document.activeElement === out, 'search failure must not steal focus');
});

for (const isDay of [true, false])
  test(`clear ${isDay ? 'day' : 'night'} uses approved distinct Dock glyph while preserving panel glyph`, async () => {
    const s = setup({ service: { weather: async () => ({ ...weather, code: 0, isDay }) } });
    const trigger = s.document.querySelector('[data-weather-toggle]');
    trigger.innerHTML = dockWeatherIcon();
    await s.search();
    s.click('[data-weather-city]');
    await tick();
    const expectedDock = parseHTML(`<div>${dockWeatherIcon(isDay ? 'sun' : 'moon')}</div>`).document.querySelector(
      'div',
    ).innerHTML;
    assert.equal(trigger.innerHTML, expectedDock);
    const actual = s.document.querySelector('.weather-symbol').innerHTML;
    const { document } = parseHTML(`<div id="expected">${weatherIcon(isDay ? 'sun' : 'moon')}</div>`);
    assert.equal(actual, document.querySelector('#expected').innerHTML);
    assert.notEqual(actual, trigger.innerHTML, 'Dock has its own distinct clear-sky artwork');
  });
