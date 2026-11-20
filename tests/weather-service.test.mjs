import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createWeatherService,
  condition,
  parseWeather,
  parsePlaces,
  cityTime,
  readStoredPlace,
  persistablePlace,
  isCurrentStale,
  WeatherRequestError,
} from '../src/scripts/weather/service.ts';
import { officialWeatherApiCodes } from '../src/scripts/weather/conditions.ts';

const payload = (over = {}) => ({
  provider: 'weatherapi',
  weather: {
    provider: 'weatherapi',
    temperature: 18.2,
    code: 1003,
    isDay: true,
    high: 21,
    low: 14,
    time: 1795146300,
    timezone: 'Asia/Shanghai',
    humidity: 60,
    windKph: 12,
    windDegree: 90,
    ...over,
  },
});
const shanghai = {
  provider: 'weatherapi',
  id: 458816,
  name: '上海',
  latitude: 31.23,
  longitude: 121.47,
  region: 'Shanghai',
  country: '中国',
  detail: 'Shanghai · 中国',
};
const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test('every official WeatherAPI code has bilingual text and unknown stays neutral', () => {
  assert.equal(officialWeatherApiCodes.length, 60);
  assert.ok(officialWeatherApiCodes.includes(1036));
  assert.ok(officialWeatherApiCodes.includes(1063));
  for (const code of officialWeatherApiCodes) {
    assert.notEqual(condition(code, 'en').text, 'Unknown conditions');
    assert.notEqual(condition(code, 'en').icon, 'unknown');
    assert.match(condition(code, 'zh').text, /[\u4e00-\u9fff]/);
    assert.notEqual(condition(code, 'zh').icon, 'unknown');
  }
  assert.equal(condition(123, 'en').text, 'Unknown conditions');
  assert.equal(condition(123, 'en').icon, 'unknown');
  assert.equal(condition(0, 'en').icon, 'unknown', 'legacy WMO clear must not map as sunny');
  assert.equal(condition(1000, 'en', false).icon, 'moon');
  assert.equal(condition(1000, 'en', true).text, 'Sunny');
  assert.equal(condition(1000, 'en', false).text, 'Clear');
});

test('1036 smoke/haze and 1063 rainy map to official wording and the nine-state glyphs', () => {
  assert.equal(condition(1036, 'en').text, 'Smoky haze');
  assert.equal(condition(1036, 'zh').text, '烟霾');
  assert.equal(condition(1036, 'en').icon, 'fog');
  assert.equal(condition(1036, 'en', false).icon, 'fog');
  assert.equal(condition(1063, 'en').text, 'Patchy rain possible');
  assert.equal(condition(1063, 'zh').text, '附近局部降雨');
  assert.equal(condition(1063, 'en').icon, 'rain');
});

test('weather rejects null/nonfinite values, missing provider, invalid times and zones', () => {
  assert.equal(parseWeather(payload()).temperature, 18.2);
  assert.equal(parseWeather(payload()).provider, 'weatherapi');
  assert.equal(parseWeather(payload()).humidity, 60);
  for (const alter of [
    (p) => (p.weather.temperature = null),
    (p) => (p.weather.temperature = Infinity),
    (p) => (p.weather.high = 10),
    (p) => (p.weather.low = 30),
    (p) => (p.weather.timezone = 'not/a-zone'),
    (p) => (p.weather.time = '2026-11-20'),
    (p) => (p.weather.isDay = 1),
    (p) => (p.provider = 'open-meteo'),
    (p) => (p.weather.provider = 'wmo'),
    (p) => delete p.weather.humidity,
  ]) {
    const p = payload();
    alter(p);
    assert.throws(() => parseWeather(p));
  }
  assert.throws(() => parseWeather(null));
  assert.equal(cityTime(1795146300, 'Asia/Shanghai', 'en').includes('11:45'), true);
});

test('search validates candidates, distinguishes same names, and sends q plus lang', async () => {
  const urls = [];
  const service = createWeatherService({
    origin: 'https://hychiiu.com',
    fetcher: async (url) => {
      urls.push(String(url));
      return response({
        provider: 'weatherapi',
        results: [
          { ...shanghai, region: '上海市' },
          { ...shanghai, id: 458817, region: '四川', detail: undefined },
          { name: 'bad', latitude: null, longitude: 0 },
          { id: 1816670, name: '北京', latitude: 39.9, longitude: 116.4 },
        ],
      });
    },
  });
  assert.deepEqual(await service.search('a', 'zh'), []);
  assert.equal(urls.length, 0);
  const cities = await service.search('上海', 'zh');
  assert.equal(cities.length, 2);
  assert.equal(cities[0].provider, 'weatherapi');
  assert.equal(cities[0].id, 458816);
  assert.notEqual(cities[0].detail, cities[1].detail);
  assert.equal(
    cities.some((c) => c.id === 1816670),
    false,
    'results without provider are dropped',
  );
  const search = new URL(urls[0]);
  assert.equal(search.pathname, '/api/weather/search');
  assert.equal(search.searchParams.get('q'), '上海');
  assert.equal(search.searchParams.get('lang'), 'zh');
  await service.search('London', 'en');
  assert.equal(new URL(urls[1]).searchParams.get('lang'), 'en');
  assert.deepEqual(parsePlaces({ provider: 'weatherapi' }), []);
  assert.throws(() => parsePlaces({}));
  const long = 'x'.repeat(90);
  await service.search(long, 'en');
  assert.equal(new URL(urls[2]).searchParams.get('q').length, 80);
});

test('forecast uses cityId for WeatherAPI places and POST WGS84 coordinates otherwise', async () => {
  const calls = [];
  const service = createWeatherService({
    origin: 'https://hychiiu.com',
    fetcher: async (url, opts = {}) => {
      calls.push({ url: new URL(url), opts });
      return response(payload());
    },
  });
  await service.weather(shanghai);
  const get = calls[0];
  assert.equal(get.url.pathname, '/api/weather/forecast');
  assert.equal(get.url.searchParams.get('cityId'), '458816');
  assert.equal(get.opts.method ?? 'GET', 'GET');
  assert.equal(get.opts.credentials, 'same-origin');
  assert.equal(get.opts.referrerPolicy, 'no-referrer');

  const legacy = { name: '北京', latitude: 39.9, longitude: 116.4, id: 1816670 };
  await service.weather(legacy);
  const post = calls[1];
  assert.equal(post.url.pathname, '/api/weather/forecast');
  assert.equal(post.url.search, '');
  assert.equal(post.opts.method, 'POST');
  assert.deepEqual(JSON.parse(post.opts.body), {
    coordinates: { latitude: 39.9, longitude: 116.4, system: 'wgs84' },
  });
  assert.equal(String(post.opts.body).includes('1816670'), false);
});

test('stored GeoNames-shaped records keep name and WGS84 coords but drop the old id', () => {
  const legacy = readStoredPlace({
    name: '北京',
    latitude: 39.9,
    longitude: 116.4,
    detail: '北京市 · 中国',
    id: 1816670,
  });
  assert.equal(legacy.provider, 'legacy-wgs84');
  assert.equal(legacy.name, '北京');
  assert.equal(legacy.latitude, 39.9);
  assert.equal(legacy.id, undefined);
  assert.deepEqual(persistablePlace(legacy).id, undefined);
  const next = readStoredPlace({
    provider: 'weatherapi',
    id: 458816,
    name: '上海',
    latitude: 31.23,
    longitude: 121.47,
  });
  assert.equal(next.provider, 'weatherapi');
  assert.equal(next.id, 458816);
  assert.equal(readStoredPlace({ name: '@location', latitude: 31, longitude: 121 }), undefined);
});

test('weather is lazy, cached for ten minutes, and stale observations are not kept', async () => {
  let calls = 0,
    now = 1_795_146_300_000;
  const service = createWeatherService({
    now: () => now,
    origin: 'https://hychiiu.com',
    fetcher: async () => {
      calls++;
      return response(payload({ time: Math.floor(now / 1000) }));
    },
  });
  assert.equal(calls, 0);
  await service.weather(shanghai);
  await service.weather(shanghai);
  assert.equal(calls, 1);
  now += 599_999;
  await service.weather(shanghai);
  assert.equal(calls, 1, 'just under ten minutes still hits cache');
  now += 1;
  await service.weather(shanghai);
  assert.equal(calls, 2);

  const staleService = createWeatherService({
    now: () => now,
    fetcher: async () => {
      calls++;
      return response(payload({ time: Math.floor(now / 1000) - 3601 }));
    },
  });
  const stale = await staleService.weather(shanghai);
  assert.equal(isCurrentStale(stale, now), true);
  const before = calls;
  await staleService.weather(shanghai);
  assert.equal(calls, before + 1, 'observations older than 60 minutes are not cached');
});

test('HTTP failures and invalid payloads are not cached and surface provider codes', async () => {
  let calls = 0;
  const service = createWeatherService({
    fetcher: async () => {
      calls++;
      return response({ error: true, code: 'RATE_LIMITED' }, 429);
    },
  });
  await assert.rejects(service.weather(shanghai), (err) => {
    assert.equal(err instanceof WeatherRequestError, true);
    assert.equal(err.code, 'RATE_LIMITED');
    return true;
  });
  await assert.rejects(service.weather(shanghai));
  assert.equal(calls, 2);
  const unavailable = createWeatherService({
    fetcher: async () => response({ code: 'QUOTA_UNAVAILABLE' }, 503),
  });
  await assert.rejects(unavailable.weather(shanghai), (err) => err.code === 'QUOTA_UNAVAILABLE');
});

test('timeout and caller abort cancel the request', async () => {
  const fetcher = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  const service = createWeatherService({ fetcher, timeoutMs: 15 });
  await assert.rejects(service.weather(shanghai), (err) => {
    assert.equal(err instanceof WeatherRequestError, true);
    assert.equal(err.code, 'UPSTREAM_TIMEOUT');
    return true;
  });
  const abort = new AbortController();
  const pending = service.weather(shanghai, abort.signal);
  abort.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('places without optional administrative fields remain valid weather locations via coordinates', async () => {
  const p = { name: 'Remote', latitude: 1, longitude: 2 };
  let body;
  const service = createWeatherService({
    fetcher: async (_url, opts) => {
      body = opts.body;
      return response(payload());
    },
  });
  assert.equal((await service.weather(p)).temperature, 18.2);
  assert.equal(JSON.parse(body).coordinates.system, 'wgs84');
});
