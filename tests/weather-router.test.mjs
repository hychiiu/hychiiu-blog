/**
 * Real controller + rendered DOM + service/parser under the actual Astro ordering:
 * ClientRouter's document bubble listener is registered first, then the feature.
 * navigate() dispatches before-preparation synchronously before its first await.
 * LinkeDOM does not implement capture order (it runs registration order), so the
 * submit dispatcher below explicitly models browser capture -> target -> bubble.
 * Click and Enter synthesize their native SubmitEvent with/without submitter.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { bindWeather } from '../src/scripts/weather/controller.ts';
import { createWeatherService } from '../src/scripts/weather/service.ts';
const tick = () => new Promise((r) => setTimeout(r, 0));
function setup({ networkFailure = false } = {}) {
  const { document, window } = parseHTML(
    '<html data-lang="zh"><body><nav data-dock><button data-weather-toggle aria-expanded="false">天气</button></nav><section id="weather-panel" hidden></section></body></html>',
  );
  window.HTMLElement.prototype.focus = function (options) {
    document._active = this;
    assert.equal(options.preventScroll, true);
  };
  Object.defineProperty(document, 'activeElement', { get: () => document._active });
  window.innerWidth = 800;
  const submissions = { capture: [], bubble: [] },
    originalAdd = document.addEventListener.bind(document);
  document.addEventListener = (type, fn, options) => {
    if (type !== 'submit') return originalAdd(type, fn, options);
    const capture = options === true || options?.capture === true;
    submissions[capture ? 'capture' : 'bubble'].push(fn);
  };
  const navigation = { href: 'http://localhost:4388/posts/?tag=network', scrollY: 470, preparations: 0 },
    requests = [];
  // Registered BEFORE bindWeather, like ClientRouter's head script.
  document.addEventListener('submit', (event) => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    navigation.preparations++;
    document.dispatchEvent(new window.Event('astro:before-preparation'));
    const url = new URL(navigation.href);
    url.search = new URLSearchParams({ city: event.target.querySelector('input').value });
    navigation.href = url.href;
    navigation.scrollY = 0;
  });
  const service = createWeatherService({
    fetcher: async (url) => {
      requests.push(new URL(url));
      if (networkFailure) throw Error('offline');
      if (String(url).includes('geocoding-api')) {
        const q = new URL(url).searchParams.get('name');
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                id: 1,
                name: q,
                latitude: 39.9,
                longitude: 116.4,
                admin1: q === '北京' ? '北京市' : 'England',
                country: q === '北京' ? '中国' : 'United Kingdom',
              },
            ],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          timezone: 'Asia/Shanghai',
          current: { temperature_2m: 18, weather_code: 2, is_day: 1, time: 1795146300 },
          daily: { temperature_2m_max: [21], temperature_2m_min: [14] },
        }),
      };
    },
  });
  bindWeather({ document, window, service, storage: { getItem: () => null, setItem() {}, removeItem() {} } });
  const click = (selector) =>
    document.querySelector(selector).dispatchEvent(new window.Event('click', { bubbles: true }));
  click('[data-weather-toggle]');
  if (!document.querySelector('input')) click('[data-weather-action="manual"]');
  async function submit(query, via) {
    const form = document.querySelector('form'),
      input = form.querySelector('input'),
      button = form.querySelector('button[type="submit"]');
    input.value = query;
    const promises = [];
    const dispatch = (submitter) => {
      const event = {
        type: 'submit',
        target: form,
        submitter,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      for (const fn of submissions.capture) promises.push(fn(event));
      for (const fn of submissions.bubble) promises.push(fn(event));
    };
    if (via === 'button') {
      button.addEventListener('click', () => dispatch(button), { once: true });
      button.dispatchEvent(new window.Event('click', { bubbles: true }));
    } else {
      input.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Enter') dispatch(null);
        },
        { once: true },
      );
      const key = new window.Event('keydown', { bubbles: true });
      key.key = 'Enter';
      input.dispatchEvent(key);
    }
    await Promise.all(promises);
    await tick();
  }
  return { document, navigation, requests, submit, click };
}
for (const via of ['button', 'enter'])
  for (const query of ['北京', 'London'])
    test(`ClientRouter registered first: ${via} searches ${query} without navigating or closing`, async () => {
      const s = setup();
      await s.submit(query, via);
      assert.equal(s.navigation.preparations, 0, 'router must see defaultPrevented before it can dispatch preparation');
      assert.equal(s.navigation.href, 'http://localhost:4388/posts/?tag=network');
      assert.equal(s.navigation.scrollY, 470);
      assert.equal(s.document.querySelector('#weather-panel').hidden, false);
      assert.match(s.document.querySelector('[data-weather-city]').textContent, new RegExp(query));
      assert.equal(s.requests.length, 1);
      assert.equal(s.requests[0].searchParams.get('name'), query);
      s.click('[data-weather-city]');
      await tick();
      assert.equal(s.requests.length, 2);
      assert.ok(s.document.querySelector('.weather-temperature'));
      assert.equal(s.navigation.preparations, 0);
    });
test('capture ownership also protects blank/one-character submissions and network failure', async () => {
  for (const query of ['', 'a']) {
    const s = setup();
    await s.submit(query, 'enter');
    assert.equal(s.navigation.preparations, 0);
    assert.equal(s.requests.length, 0);
    assert.equal(s.document.querySelector('#weather-panel').hidden, false);
    assert.ok(s.document.querySelector('input'));
    assert.match(s.document.querySelector('#weather-panel').textContent, /至少两个/);
  }
  const failed = setup({ networkFailure: true });
  await failed.submit('北京', 'button');
  assert.equal(failed.navigation.preparations, 0);
  assert.equal(failed.navigation.scrollY, 470);
  assert.equal(failed.document.querySelector('#weather-panel').hidden, false);
  assert.match(failed.document.querySelector('#weather-panel').textContent, /暂时无法搜索城市/);
  assert.ok(failed.document.querySelector('form'));
});
