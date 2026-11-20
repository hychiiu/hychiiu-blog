import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createWeatherService,
  condition,
  parseWeather,
  parsePlaces,
  cityTime,
} from '../src/scripts/weather/service.ts';

const payload = () => ({
  timezone: 'Asia/Shanghai',
  current: { temperature_2m: 18.2, weather_code: 2, is_day: 1, time: 1795146300 },
  daily: { temperature_2m_max: [21], temperature_2m_min: [14] },
});
const place = { name: '北京', latitude: 39.9, longitude: 116.4 };
const response = (body) => ({ ok: true, json: async () => body });
test('every official code has bilingual text and unknown has fallback', () => {
  for (const code of [
    0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 97, 99,
  ]) {
    assert.notEqual(condition(code, 'en').text, 'Unknown conditions');
    assert.match(condition(code, 'zh').text, /[\u4e00-\u9fff]/);
  }
  assert.equal(condition(123, 'en').text, 'Unknown conditions');
  assert.equal(condition(0, 'en', false).icon, 'moon');
});
test('weather rejects null/nonfinite temperatures, invalid times and zones', () => {
  assert.equal(parseWeather(payload()).temperature, 18.2);
  for (const alter of [
    (p) => (p.current.temperature_2m = null),
    (p) => (p.current.temperature_2m = Infinity),
    (p) => (p.daily.temperature_2m_min = []),
    (p) => (p.timezone = 'not/a-zone'),
    (p) => (p.current.time = '2026-11-20'),
    (p) => (p.daily.temperature_2m_min = [30]),
  ]) {
    const p = payload();
    alter(p);
    assert.throws(() => parseWeather(p));
  }
  assert.throws(() => parseWeather(null));
  assert.equal(cityTime(1795146300, 'Asia/Shanghai', 'en').includes('11:45'), true);
});
test('search validates candidates, distinguishes same names, and encodes zh/en', async () => {
  const urls = [];
  const service = createWeatherService({
    fetcher: async (url) => {
      urls.push(String(url));
      return response({
        results: [
          { id: 1, ...place, admin1: '北京市', country: '中国' },
          { id: 2, ...place, admin1: '四川', country: '中国' },
          { name: 'bad', latitude: null, longitude: 0 },
        ],
      });
    },
  });
  assert.deepEqual(await service.search('a', 'zh'), []);
  assert.equal(urls.length, 0);
  const cities = await service.search('北京', 'zh');
  assert.equal(cities.length, 2);
  assert.notEqual(cities[0].detail, cities[1].detail);
  assert.equal(new URL(urls[0]).searchParams.get('name'), '北京');
  assert.equal(new URL(urls[0]).searchParams.get('language'), 'zh');
  await service.search('London', 'en');
  assert.equal(new URL(urls[1]).searchParams.get('language'), 'en');
  assert.deepEqual(parsePlaces({}), []);
  assert.throws(() => parsePlaces({ error: true }));
});
test('weather is lazy, cached for ten minutes, and requests minimum fields', async () => {
  let calls = 0,
    now = 0,
    url;
  const service = createWeatherService({
    now: () => now,
    fetcher: async (u, opts) => {
      calls++;
      url = new URL(u);
      assert.equal(opts.credentials, 'omit');
      assert.equal(opts.referrerPolicy, 'no-referrer');
      return response(payload());
    },
  });
  assert.equal(calls, 0);
  await service.weather(place);
  await service.weather(place);
  assert.equal(calls, 1);
  assert.equal(url.searchParams.get('timezone'), 'auto');
  assert.equal(url.searchParams.get('timeformat'), 'unixtime');
  assert.equal(url.searchParams.get('forecast_days'), '1');
  now = 600001;
  await service.weather(place);
  assert.equal(calls, 2);
});
test('HTTP failures and invalid payloads are not cached', async () => {
  let calls = 0;
  const service = createWeatherService({
    fetcher: async () => {
      calls++;
      return { ok: false, status: 429 };
    },
  });
  await assert.rejects(service.weather(place));
  await assert.rejects(service.weather(place));
  assert.equal(calls, 2);
});
test('timeout and caller abort cancel the request', async () => {
  const fetcher = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  const service = createWeatherService({ fetcher, timeoutMs: 15 });
  await assert.rejects(service.weather(place), /timeout/);
  const abort = new AbortController();
  const pending = service.weather(place, abort.signal);
  abort.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('cities without optional administrative fields remain valid weather locations', async () => {
  const p = parsePlaces({ results: [{ name: 'Remote', latitude: 1, longitude: 2 }] })[0];
  const service = createWeatherService({ fetcher: async () => response(payload()) });
  assert.equal((await service.weather(p)).temperature, 18.2);
});
