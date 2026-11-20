import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { bindWeather } from '../src/scripts/weather/controller.ts';
import { noteDockPointer, clearDockPointer } from '../src/scripts/dock-tooltip.ts';
import { renderWeather } from '../src/scripts/weather/view.ts';
import { weatherIcon } from '../src/scripts/weather/icons.ts';
import { dockWeatherIcon } from '../src/scripts/weather/dock-icons.ts';
const weather = {
  provider: 'weatherapi',
  temperature: 18.2,
  code: 1003,
  isDay: true,
  high: 21,
  low: 14,
  time: Math.floor(Date.now() / 1000),
  timezone: 'Asia/Shanghai',
  humidity: 60,
  windKph: 12,
  windDegree: 90,
};
const city = {
  provider: 'weatherapi',
  id: 458816,
  name: '北京',
  detail: '北京市 · 中国',
  latitude: 39.9,
  longitude: 116.4,
  region: '北京市',
  country: '中国',
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function setup(overrides = {}) {
  const { document, window } = parseHTML(
    '<html data-lang="zh"><body><nav data-dock><ul><li class="dock-item"><button class="dock-btn" data-weather-toggle aria-expanded="false" aria-controls="weather-panel">天气</button></li></ul></nav><section id="weather-panel" hidden role="dialog" aria-labelledby="weather-title"></section><button id="outside">out</button></body></html>',
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
  clearDockPointer();
  bindWeather(host);
  const click = (sel, { detail = 1 } = {}) => {
    const el = document.querySelector(sel);
    assert.ok(el, sel);
    // LinkeDOM does not move focus on click; real buttons do, and Escape-restore relies on it.
    el.focus();
    const ev = new window.Event('click', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'detail', { value: detail });
    el.dispatchEvent(ev);
  };
  const event = (type) => document.dispatchEvent(new window.Event(type));
  const search = async () => {
    click('[data-weather-toggle]');
    if (!document.querySelector('input')) click('[data-weather-action="manual"]');
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
  const panel = s.document.querySelector('#weather-panel');
  assert.match(panel.textContent, /看看你那里的天气/);
  assert.ok(panel.querySelector('input'));
  assert.ok(panel.querySelector('[type="submit"]'));
  const locate = panel.querySelector('[data-weather-action="locate"]');
  assert.ok(locate);
  assert.equal(locate.classList.contains('is-primary'), false);
  assert.equal(panel.querySelector('[data-weather-action="manual"]'), null);
  assert.match(panel.innerHTML, /weatherIcon|viewBox="0 0 24 24"/);
  assert.equal(s.document.querySelector('[data-weather-toggle]').getAttribute('aria-expanded'), 'true');
  assert.equal(
    s.document.activeElement === panel.querySelector('input'),
    false,
    'pointer open must not focus the input',
  );
  s.event('pointerleave');
  assert.equal(panel.hidden, false);
});
test('explicit location rejection gives clear manual fallback without storage', async () => {
  const s = setup();
  s.click('[data-weather-toggle]');
  s.click('[data-weather-action="locate"]');
  await tick();
  assert.equal(s.calls.locate, 1);
  assert.match(s.document.querySelector('#weather-panel').textContent, /定位未获允许/);
  assert.ok(s.document.querySelector('input'), 'native locate failure must keep the search form usable');
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
  assert.equal(s.document.activeElement === s.document.querySelector('[data-weather-toggle]'), true);
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
    {
      mode: 'weather',
      place: { ...city, name: '<img src=x onerror=alert(1)>' },
      weather: { ...weather, code: 999, time: 1795146300 },
    },
    'en',
  );
  assert.equal(html.includes('<img src=x'), false);
  assert.match(html, /Unknown conditions/);
  assert.match(html, /WeatherAPI\.com/);
  assert.equal(html.includes('Open-Meteo'), false);
  assert.equal(html.includes('GeoNames'), false);
  assert.equal(html.includes('creativecommons'), false);
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
test('attribution credits WeatherAPI.com and privacy copy matches the same-origin path', () => {
  const { document } = parseHTML(renderWeather({ mode: 'weather', place: city, weather }, 'en'));
  const link = document.querySelector('a[href="https://www.weatherapi.com/"]');
  assert.ok(link);
  assert.ok(link.closest('details') === null, 'attribution must not be collapsed');
  const choice = renderWeather({ mode: 'choice' }, 'en');
  assert.match(choice, /WeatherAPI\.com/);
  assert.match(choice, /this site/);
  assert.equal(choice.includes('90 days'), false);
  assert.equal(choice.includes('Open-Meteo'), false);
  assert.equal(choice.includes('GeoNames'), false);
  assert.match(choice, /WeatherAPI terms/);
  const { document: initial } = parseHTML(`<div id="root">${choice}</div>`);
  const terms = initial.querySelector('a[href="https://www.weatherapi.com/terms.aspx"]');
  assert.ok(terms);
  assert.ok(terms.closest('details'), 'terms belong inside the privacy details');
  const provider = initial.querySelector('.weather-privacy');
  assert.ok(provider);
  assert.equal(provider.querySelector('a'), null, 'provider sentence must not repeat the details label as a link');
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
    assert.ok(s.document.querySelector('input'), 'native locate failure must keep the search form usable');
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
  if (!s.document.querySelector('input')) s.click('[data-weather-action="manual"]');
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
  assert.equal(s.document.querySelector('input').value, '北京');
  s.document.querySelector('form').dispatchEvent(new s.window.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  assert.match(s.document.querySelector('#weather-panel').textContent, /没有找到城市/);
  assert.equal(s.document.querySelector('input').value, '北京');
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
  if (!q.document.querySelector('input')) q.click('[data-weather-action="manual"]');
  q.document.querySelector('input').value = 'London';
  q.document.querySelector('form').dispatchEvent(new q.window.Event('submit', { bubbles: true, cancelable: true }));
  const out = q.document.querySelector('#outside');
  out.focus();
  rejectSearch(Error('offline'));
  await tick();
  assert.ok(q.document.activeElement === out, 'search failure must not steal focus');
});

for (const isDay of [true, false])
  test(`clear ${isDay ? 'day' : 'night'} uses shared approved v2 paths at Dock 20px and panel 24px`, async () => {
    const s = setup({ service: { weather: async () => ({ ...weather, code: 1000, isDay }) } });
    const trigger = s.document.querySelector('[data-weather-toggle]');
    trigger.innerHTML = dockWeatherIcon();
    await s.search();
    s.click('[data-weather-city]');
    await tick();
    const kind = isDay ? 'sun' : 'moon';
    const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const actual = s.document.querySelector('.weather-symbol').innerHTML;
    // LinkeDOM may serialize self-closing tags with a space before />.
    const normalize = (svg) => svg.replace(/\s+\/>/g, '/>');
    assert.equal(normalize(trigger.innerHTML), normalize(dockWeatherIcon(kind)));
    assert.equal(normalize(actual), normalize(weatherIcon(kind)));
    assert.equal(inner(normalize(actual)), inner(normalize(dockWeatherIcon(kind))));
    assert.match(actual, /width="24"/);
    assert.match(trigger.innerHTML, /width="20"/);
  });
test('keyboard open may focus the search field; pointer open does not', () => {
  const pointer = setup();
  pointer.click('[data-weather-toggle]', { detail: 1 });
  assert.notEqual(pointer.document.activeElement, pointer.document.querySelector('input'));
  const keys = setup();
  keys.click('[data-weather-toggle]', { detail: 0 });
  assert.equal(keys.document.activeElement, keys.document.querySelector('input'));
});

function keydown(window, target, { key, isComposing = false, keyCode = 0 } = {}) {
  const Ctor = window.KeyboardEvent || window.Event;
  const ev = new Ctor('keydown', { key, bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'key', { value: key });
  Object.defineProperty(ev, 'isComposing', { value: isComposing });
  Object.defineProperty(ev, 'keyCode', { value: keyCode });
  target.dispatchEvent(ev);
  return ev;
}
function maybeSubmit(document, ev) {
  if (ev.defaultPrevented) return;
  const form = document.querySelector('form');
  form.dispatchEvent(new document.defaultView.Event('submit', { bubbles: true, cancelable: true }));
}

test('IME composition Enter does not submit a city search', async () => {
  const s = setup();
  s.click('[data-weather-toggle]');
  const input = s.document.querySelector('input');
  input.value = '北';
  const ev = keydown(s.window, input, { key: 'Enter', isComposing: true, keyCode: 229 });
  await tick();
  assert.equal(ev.defaultPrevented, true);
  assert.equal(s.calls.search, 0);
});

test('non-Enter composition keydown is not cancelled', () => {
  const s = setup();
  s.click('[data-weather-toggle]');
  const input = s.document.querySelector('input');
  input.value = '北';
  for (const key of ['Process', 'a', 'Escape']) {
    const ev = keydown(s.window, input, { key, isComposing: true, keyCode: 229 });
    assert.equal(ev.defaultPrevented, false, `${key} during composition must not be preventDefaulted`);
  }
  assert.equal(s.calls.search, 0);
  assert.equal(s.document.querySelector('#weather-panel').hidden, false);
});

test('composition start/end then candidate-confirm Enter does not search; a later Enter does', async () => {
  const s = setup();
  s.click('[data-weather-toggle]');
  const input = s.document.querySelector('input');
  input.value = '北京';
  input.dispatchEvent(new s.window.Event('compositionstart', { bubbles: true }));
  const during = keydown(s.window, input, { key: 'Enter', isComposing: true, keyCode: 229 });
  maybeSubmit(s.document, during);
  await tick();
  assert.equal(during.defaultPrevented, true);
  assert.equal(s.calls.search, 0);
  input.dispatchEvent(new s.window.Event('compositionend', { bubbles: true }));
  const confirm = keydown(s.window, input, { key: 'Enter', isComposing: false, keyCode: 13 });
  maybeSubmit(s.document, confirm);
  await tick();
  assert.equal(confirm.defaultPrevented, true, 'Enter that confirms an IME candidate must not submit');
  assert.equal(s.calls.search, 0);
  await tick();
  const later = keydown(s.window, input, { key: 'Enter', isComposing: false, keyCode: 13 });
  maybeSubmit(s.document, later);
  await tick();
  assert.equal(later.defaultPrevented, false);
  assert.equal(s.calls.search, 1);
});

test('unfinished composition after close does not block Enter or Escape on the next open', async () => {
  const s = setup();
  s.click('[data-weather-toggle]');
  const input = s.document.querySelector('input');
  input.value = '北';
  input.dispatchEvent(new s.window.Event('compositionstart', { bubbles: true }));
  s.click('[data-weather-toggle]', { detail: 1 });
  assert.equal(s.document.querySelector('#weather-panel').hidden, true);
  assert.equal(s.calls.search, 0);
  s.click('[data-weather-toggle]', { detail: 1 });
  const live = s.document.querySelector('input');
  assert.ok(live);
  live.value = '北京';
  const enter = keydown(s.window, live, { key: 'Enter', isComposing: false, keyCode: 13 });
  maybeSubmit(s.document, enter);
  await tick();
  assert.equal(enter.defaultPrevented, false, 'Enter after a closed composition must not stay suppressed');
  assert.equal(s.calls.search, 1);
  const escTarget = s.document.querySelector('input') ?? s.document;
  const esc = keydown(s.window, escTarget, { key: 'Escape' });
  assert.equal(esc.defaultPrevented, true);
  assert.equal(s.document.querySelector('#weather-panel').hidden, true);
});

test('unfinished composition after a redraw does not block Enter on the replacement input', async () => {
  const s = setup();
  s.click('[data-weather-toggle]');
  const input = s.document.querySelector('input');
  input.value = '北';
  input.dispatchEvent(new s.window.Event('compositionstart', { bubbles: true }));
  input.value = '';
  input.dispatchEvent(new s.window.Event('input', { bubbles: true }));
  const live = s.document.querySelector('input');
  assert.ok(live);
  assert.notEqual(live, input, 'draw must replace the composing input');
  live.value = '北京';
  const enter = keydown(s.window, live, { key: 'Enter', isComposing: false, keyCode: 13 });
  maybeSubmit(s.document, enter);
  await tick();
  assert.equal(enter.defaultPrevented, false);
  assert.equal(s.calls.search, 1);
});

test('clearing the search field cancels an in-flight request and keeps the query empty', async () => {
  let rejectSearch;
  let searches = 0;
  const s = setup({
    service: {
      search: () => {
        searches += 1;
        return new Promise((_ok, fail) => {
          rejectSearch = fail;
        });
      },
    },
  });
  s.click('[data-weather-toggle]');
  const input = s.document.querySelector('input');
  input.value = 'London';
  input.closest('form').dispatchEvent(new s.window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(searches, 1);
  // Submit redraws the form; act on the live input, not the detached node.
  const live = s.document.querySelector('input');
  live.value = '';
  live.dispatchEvent(new s.window.Event('input', { bubbles: true }));
  await tick();
  rejectSearch(Error('offline'));
  await tick();
  assert.equal(s.document.querySelector('input').value, '');
  assert.doesNotMatch(s.document.querySelector('#weather-panel').textContent, /暂时无法搜索城市/);
});

test('privacy copy describes native locate and never promises AMap', () => {
  const html = renderWeather({ mode: 'choice' }, 'zh');
  assert.match(html, /主动点击后申请定位/);
  assert.match(html, /不会用 IP/);
  assert.doesNotMatch(html, /高德|AMap|amap/);
});

test('keyboard toggle close does not pointer-suppress when the pointer is outside the item', () => {
  const s = setup();
  const item = s.document.querySelector('.dock-item');
  assert.ok(item);
  const orig = item.matches.bind(item);
  item.matches = (sel) => (sel === ':hover' ? false : orig(sel));
  s.document.elementFromPoint = () => s.document.querySelector('#outside');
  s.click('[data-weather-toggle]', { detail: 0 });
  s.click('[data-weather-toggle]', { detail: 0 });
  assert.equal(s.document.querySelector('#weather-panel').hidden, true);
  assert.equal(item.classList.contains('is-tip-pointer-suppressed'), false);
  assert.equal(item.classList.contains('is-tip-focus-suppressed'), true);
});

test('pointer toggle close suppresses pointer when the pointer is on the item', () => {
  const s = setup();
  const item = s.document.querySelector('.dock-item');
  const trigger = s.document.querySelector('[data-weather-toggle]');
  const orig = item.matches.bind(item);
  item.matches = (sel) => (sel === ':hover' ? true : orig(sel));
  s.document.elementFromPoint = () => trigger;
  noteDockPointer(20, 20);
  s.click('[data-weather-toggle]', { detail: 1 });
  s.click('[data-weather-toggle]', { detail: 1 });
  assert.equal(s.document.querySelector('#weather-panel').hidden, true);
  assert.equal(item.classList.contains('is-tip-pointer-suppressed'), true);
});

test('Escape with no lastPointer still pointer-suppresses when the trigger is :hover', () => {
  const s = setup();
  const item = s.document.querySelector('.dock-item');
  const orig = item.matches.bind(item);
  item.matches = (sel) => (sel === ':hover' ? true : orig(sel));
  s.click('[data-weather-toggle]', { detail: 1 });
  const key = new s.window.Event('keydown');
  key.key = 'Escape';
  s.document.dispatchEvent(key);
  assert.equal(s.document.querySelector('#weather-panel').hidden, true);
  assert.equal(item.classList.contains('is-tip-pointer-suppressed'), true);
  assert.equal(item.classList.contains('is-tip-focus-suppressed'), true);
});

test('legacy stored GeoNames id is kept as a manual city but never sent as a WeatherAPI id', async () => {
  const places = [];
  const writes = [];
  const s = setup({
    storage: {
      getItem: () =>
        JSON.stringify({ name: '北京', latitude: 39.9, longitude: 116.4, id: 1816670, detail: '北京市 · 中国' }),
      setItem: (_key, value) => writes.push(JSON.parse(value)),
      removeItem() {},
    },
    service: {
      weather: async (place) => {
        places.push(place);
        return weather;
      },
    },
  });
  assert.equal(s.calls.weather, 0);
  s.click('[data-weather-toggle]');
  await tick();
  assert.equal(places.length, 1);
  assert.equal(places[0].name, '北京');
  assert.equal(places[0].id, undefined);
  assert.equal(places[0].provider, 'legacy-wgs84');
  assert.equal(writes[0].id, undefined);
  assert.equal(writes[0].provider, 'legacy-wgs84');
  assert.equal(JSON.stringify(writes[0]).includes('1816670'), false);
  assert.match(s.document.querySelector('#weather-panel').textContent, /北京/);
});

test('forecast error codes use the matching dictionary entry', async () => {
  const { WeatherRequestError } = await import('../src/scripts/weather/service.ts');
  const s = setup({
    service: {
      weather: async () => {
        throw new WeatherRequestError('RATE_LIMITED');
      },
    },
  });
  await s.search();
  s.click('[data-weather-city]');
  await tick();
  assert.match(s.document.querySelector('#weather-panel').textContent, /请求过于频繁/);
});
