import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { createWeatherApi } from '../src/server/weather/api.ts';
import { onRequest as searchRoute } from '../functions/api/weather/search.js';
import { onRequest as forecastRoute } from '../functions/api/weather/forecast.js';

const now = Date.parse('2026-11-20T10:30:00Z');
const key = 'synthetic-weatherapi-key';
const env = { BLOG_WEATHERAPI_KEY: key };
const base = 'https://hychiiu.com/api/weather';
const place = { id: 458816, name: '上海', region: 'Shanghai', country: '中国', lat: 31.23, lon: 121.47 };
function forecast() {
  return {
    location: { tz_id: 'Asia/Shanghai', localtime: '2026-11-20 18:30', localtime_epoch: now / 1000 },
    current: {
      temp_c: 9.7,
      humidity: 60,
      wind_kph: 12,
      wind_degree: 90,
      is_day: 0,
      condition: { code: 1036, text: '烟霾' },
      last_updated: '2026-11-20 18:15',
      last_updated_epoch: now / 1000 - 900,
    },
    forecast: { forecastday: [{ date: '2026-11-20', day: { maxtemp_c: 12.3, mintemp_c: 6.4 } }] },
  };
}
function setup(fetcher = async () => Response.json([place]), timeoutMs = 100) {
  const calls = [];
  const api = createWeatherApi({
    fetch: async (...args) => {
      calls.push(args);
      return fetcher(...args);
    },
    now: () => now,
    timeoutMs,
  });
  return { api, calls };
}
function request(path = '/search?q=Shanghai&lang=zh', init) {
  return new Request(base + path, init);
}
function post(body, headers = { 'content-type': 'application/json' }) {
  return request('/forecast', { method: 'POST', headers, body: JSON.stringify(body) });
}
async function error(response, status, code) {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { code });
}

test('search returns bounded provider-namespaced places with real file-route exports', async () => {
  const { api, calls } = setup();
  const response = await api(request(), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    provider: 'weatherapi',
    results: [
      {
        provider: 'weatherapi',
        id: place.id,
        name: place.name,
        region: place.region,
        country: place.country,
        latitude: place.lat,
        longitude: place.lon,
        detail: 'Shanghai · 中国',
      },
    ],
    fetchedAt: now / 1000,
  });
  const [url, options] = calls[0];
  assert.equal(url.origin, 'https://api.weatherapi.com');
  assert.equal(url.pathname, '/v1/search.json');
  assert.deepEqual(Object.fromEntries(url.searchParams), { key, q: 'Shanghai' });
  assert.equal(options.redirect, 'manual');
  assert.equal(typeof searchRoute, 'function');
  assert.equal(typeof forecastRoute, 'function');
});
test('empty provider search is a successful empty result', async () => {
  const { api } = setup(async () => Response.json([]));
  assert.deepEqual((await (await api(request(), env)).json()).results, []);
});
test('search caps result count without changing identity', async () => {
  const { api } = setup(async () => Response.json(Array.from({ length: 20 }, (_, i) => ({ ...place, id: i + 1 }))));
  assert.equal((await (await api(request(), env)).json()).results.length, 8);
});
for (const suffix of [
  '?q=a&lang=en',
  '?q=&lang=en',
  '?q=' + '城'.repeat(81) + '&lang=zh',
  '?q=auto%3Aip&lang=en',
  '?q=id%3A1&lang=en',
  '?q=metar%3AX&lang=en',
  '?q=1.2.3.4&lang=en',
  '?q=https%3A%2F%2Fexample.com&lang=en',
  '?q=London%0A&lang=en',
  '?q=London&lang=xx',
  '?q=London&q=Paris&lang=en',
  '?q=London&lang=en&key=anything',
  '?q=London&lang=en&callback=x',
  '?q=London',
  '?lang=en',
]) {
  test(`rejects invalid search query variant ${suffix.split('&')[0].length}:${suffix.length}`, async () => {
    const { api, calls } = setup();
    await error(await api(request('/search' + suffix), env), 400, 'INVALID_REQUEST');
    assert.equal(calls.length, 0);
  });
}
for (const q of ['上海', '伦敦', 'São Paulo', "St. John's", '城'.repeat(80)]) {
  test(`accepts bounded Unicode city query of length ${q.length}`, async () => {
    const { api } = setup();
    assert.equal((await api(request('/search?q=' + encodeURIComponent(q) + '&lang=zh'), env)).status, 200);
  });
}
for (const raw of ['0', '-1', '1.5', '1e2', '01', '9007199254740992', 'auto:ip', '']) {
  test(`rejects invalid provider city id ${raw.length}:${raw.startsWith('-')}`, async () => {
    const { api, calls } = setup();
    await error(await api(request('/forecast?cityId=' + encodeURIComponent(raw)), env), 400, 'INVALID_REQUEST');
    assert.equal(calls.length, 0);
  });
}
for (const path of [
  '/forecast?cityId=1&cityId=2',
  '/forecast?cityId=1&lang=en',
  '/search/?q=London&lang=en',
  '/anything',
]) {
  test(`rejects noncontract path/query ${path.length}`, async () => {
    const { api } = setup();
    const response = await api(request(path), env);
    assert.equal(response.status, path.startsWith('/forecast?') ? 400 : 404);
  });
}
for (const url of [
  'https://preview.pages.dev/api/weather/search?q=London&lang=en',
  'http://hychiiu.com/api/weather/search?q=London&lang=en',
  'https://hychiiu.com:444/api/weather/search?q=London&lang=en',
]) {
  test(`unapproved origin rejects before runtime binding access ${url.length}`, async () => {
    const { api, calls } = setup();
    const blocked = new Proxy(
      {},
      {
        get() {
          throw new Error('must not access bindings');
        },
      },
    );
    await error(await api(new Request(url), blocked), 403, 'FORBIDDEN');
    assert.equal(calls.length, 0);
  });
}
for (const headers of [
  { origin: 'https://other.example' },
  { referer: 'https://other.example/' },
  { referer: 'not a url' },
  { 'sec-fetch-site': 'cross-site' },
  { 'sec-fetch-site': 'same-site' },
]) {
  test(`cross-source defense rejects ${Object.keys(headers)[0]}`, async () => {
    const { api, calls } = setup();
    await error(await api(request(undefined, { headers }), env), 403, 'FORBIDDEN');
    assert.equal(calls.length, 0);
  });
}
test('both production origins are supported; source headers are not claimed authentication', async () => {
  const { api } = setup();
  assert.equal((await api(new Request('https://inbluemoon.com/api/weather/search?q=London&lang=en'), env)).status, 200);
});
for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']) {
  test(`search rejects method ${method}`, async () => {
    const { api } = setup();
    const response = await api(request(undefined, { method }), env);
    assert.equal(response.headers.get('allow'), 'GET');
    await error(response, 405, 'METHOD_NOT_ALLOWED');
  });
}
for (const binding of [
  undefined,
  '',
  'https://example.com/this-is-a-link-not-a-key',
  ' contains whitespace ',
  'x'.repeat(129),
]) {
  test(`missing/unsafe runtime credential fails without upstream access ${typeof binding}:${binding?.length}`, async () => {
    const { api, calls } = setup();
    await error(await api(request(), { BLOG_WEATHERAPI_KEY: binding }), 503, 'WEATHER_UNAVAILABLE');
    assert.equal(calls.length, 0);
  });
}
test('forecast maps provider code, native day flag, daily extremes and UTC seconds without WMO fabrication', async () => {
  const { api, calls } = setup(async () => Response.json(forecast()));
  const response = await api(request('/forecast?cityId=458816'), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(data, {
    provider: 'weatherapi',
    weather: {
      provider: 'weatherapi',
      temperature: 9.7,
      code: 1036,
      isDay: false,
      high: 12.3,
      low: 6.4,
      time: now / 1000 - 900,
      timezone: 'Asia/Shanghai',
      humidity: 60,
      windKph: 12,
      windDegree: 90,
    },
    fetchedAt: now / 1000,
  });
  assert.deepEqual(Object.fromEntries(calls[0][0].searchParams), {
    key,
    q: 'id:458816',
    days: '1',
    aqi: 'no',
    alerts: 'no',
  });
  assert.equal(JSON.stringify(data).includes(key), false);
});
for (const isDay of [0, 1]) {
  test(`clear condition retains distinct day/night ${isDay}`, async () => {
    const data = forecast();
    data.current.condition.code = 1000;
    data.current.is_day = isDay;
    const { api } = setup(async () => Response.json(data));
    assert.equal((await (await api(request('/forecast?cityId=1'), env)).json()).weather.isDay, Boolean(isDay));
  });
}
test('future unknown provider condition remains numeric for neutral client fallback', async () => {
  const data = forecast();
  data.current.condition.code = 99999;
  const { api } = setup(async () => Response.json(data));
  assert.equal((await (await api(request('/forecast?cityId=1'), env)).json()).weather.code, 99999);
});
test('POST accepts only explicit WGS84 and sends no coordinate data into response or cache headers', async () => {
  const { api, calls } = setup(async () => Response.json(forecast()));
  const response = await api(post({ coordinates: { latitude: 31.23, longitude: 121.47, system: 'wgs84' } }), env);
  assert.equal(response.status, 200);
  assert.equal(calls[0][0].searchParams.get('q'), '31.23,121.47');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.text()).includes('121.47'), false);
});
for (const body of [
  {},
  { coordinates: { latitude: 31, longitude: 121, system: 'gcj02' } },
  { coordinates: { latitude: 91, longitude: 121, system: 'wgs84' } },
  { coordinates: { latitude: '31', longitude: 121, system: 'wgs84' } },
  { coordinates: { latitude: 31, longitude: 121, system: 'wgs84', extra: 1 } },
  { coordinates: { latitude: 31, longitude: 121, system: 'wgs84' }, url: 'https://example.com/' },
]) {
  test(`rejects invalid coordinate schema ${JSON.stringify(body).length}`, async () => {
    const { api, calls } = setup();
    await error(await api(post(body), env), 400, 'INVALID_REQUEST');
    assert.equal(calls.length, 0);
  });
}
test('POST requires JSON, exact query and bounded body', async () => {
  const { api, calls } = setup();
  for (const req of [
    post({}, { 'content-type': 'text/plain' }),
    request('/forecast?cityId=1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }),
    request('/forecast', { method: 'POST', headers: { 'content-type': 'application/json' }, body: ' '.repeat(2049) }),
    request('/forecast', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }),
  ]) {
    await error(await api(req, env), 400, 'INVALID_REQUEST');
  }
  assert.equal(calls.length, 0);
});
const corruptions = {
  'missing current': (d) => delete d.current,
  'unknown timezone': (d) => (d.location.tz_id = 'Not/AZone'),
  'wrong local observation': (d) => (d.current.last_updated = '2026-11-20 10:15'),
  'wrong location localtime': (d) => (d.location.localtime = '2026-11-21 18:30'),
  'wrong forecast date': (d) => (d.forecast.forecastday[0].date = '2026-11-21'),
  'future observation': (d) => (d.current.last_updated_epoch = now / 1000 + 3600),
  'string temperature': (d) => (d.current.temp_c = '9.7'),
  'boolean day flag': (d) => (d.current.is_day = false),
  'noninteger code': (d) => (d.current.condition.code = 1.5),
  'missing min': (d) => delete d.forecast.forecastday[0].day.mintemp_c,
  'inverted extremes': (d) => (d.forecast.forecastday[0].day.mintemp_c = 99),
  'invalid humidity': (d) => (d.current.humidity = 101),
  'invalid wind': (d) => (d.current.wind_kph = -1),
};
for (const [name, corrupt] of Object.entries(corruptions)) {
  test(`rejects malformed upstream ${name}`, async () => {
    const data = forecast();
    corrupt(data);
    const { api } = setup(async () => Response.json(data));
    await error(await api(request('/forecast?cityId=1'), env), 502, 'UPSTREAM_INVALID');
  });
}
for (const [code, status, machine] of [
  [1006, 404, 'LOCATION_NOT_FOUND'],
  [2006, 503, 'WEATHER_UNAVAILABLE'],
  [2007, 503, 'QUOTA_UNAVAILABLE'],
  [2008, 503, 'WEATHER_UNAVAILABLE'],
  [2009, 503, 'WEATHER_UNAVAILABLE'],
  [2010, 503, 'WEATHER_UNAVAILABLE'],
  [2011, 503, 'QUOTA_UNAVAILABLE'],
  [2012, 429, 'RATE_LIMITED'],
]) {
  test(`maps provider business code ${code} without reflecting its message`, async () => {
    const { api } = setup(async () =>
      Response.json({ error: { code, message: key + ' sensitive upstream URL' } }, { status: 400 }),
    );
    await error(await api(request(), env), status, machine);
  });
}
test('upstream HTTP redirects never become a forwarding capability', async () => {
  const { api } = setup(async () => new Response(null, { status: 302, headers: { location: 'https://example.com/' } }));
  await error(await api(request(), env), 502, 'UPSTREAM_INVALID');
});
test('upstream HTTP 429 remains rate-limited without leaking body', async () => {
  const { api } = setup(async () => new Response(key, { status: 429 }));
  await error(await api(request(), env), 429, 'RATE_LIMITED');
});
test('transport exception is not reflected', async () => {
  const { api } = setup(async () => {
    throw new Error(key);
  });
  await error(await api(request(), env), 503, 'WEATHER_UNAVAILABLE');
});
test('deadline covers hung fetch even if a mock transport ignores AbortSignal', async () => {
  const { api } = setup(() => new Promise(() => {}), 5);
  await error(await api(request(), env), 504, 'UPSTREAM_TIMEOUT');
});
test('deadline covers a stalled JSON body and cancels its reader', async () => {
  let cancelled = false;
  const { api } = setup(
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    5,
  );
  await error(await api(request(), env), 504, 'UPSTREAM_TIMEOUT');
  assert.equal(cancelled, true);
});
test('upstream JSON is bounded for streamed and declared sizes and malformed data', async () => {
  for (const make of [
    () => new Response('x'.repeat(524289), { headers: { 'content-type': 'application/json' } }),
    () => new Response('[]', { headers: { 'content-type': 'application/json', 'content-length': '9999999' } }),
    () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    () => Response.json({ wrong: [] }),
  ]) {
    const { api } = setup(async () => make());
    await error(await api(request(), env), 502, 'UPSTREAM_INVALID');
  }
});
test('public errors and successful JSON forbid shared caches, CORS and sniffing', async () => {
  const { api } = setup();
  for (const req of [request(), request('/search?q=a&lang=en')]) {
    const response = await api(req, env);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.has('access-control-allow-origin'), false);
  }
});
test('abandoned AMap scaffold is physically absent, not a default503 handler', () => {
  for (const path of [
    'functions/api/weather/location-config.js',
    'src/server/location-config.ts',
    'src/config/location.ts',
    'tests/location-config.test.mjs',
  ])
    assert.equal(existsSync(path), false);
});

test('early upstream rejection cancels an unread response body', async () => {
  for (const status of [302, 429, 500, 200]) {
    let cancelled = false;
    const { api } = setup(
      async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
          { status, headers: { 'content-type': 'text/html' } },
        ),
    );
    const response = await api(request(), env);
    assert.equal(response.status >= 400, true);
    assert.equal(cancelled, true);
  }
});
test('stalled incoming JSON body is bounded by a deadline before provider access', async () => {
  let cancelled = false;
  const { api, calls } = setup(undefined, 5);
  const body = new ReadableStream({
    cancel() {
      cancelled = true;
    },
  });
  const req = request('/forecast', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    duplex: 'half',
  });
  await error(await api(req, env), 504, 'UPSTREAM_TIMEOUT');
  assert.equal(cancelled, true);
  assert.equal(calls.length, 0);
});
test('invalid query rejects before any runtime secret getter', async () => {
  const { api } = setup();
  const bindings = new Proxy(
    {},
    {
      get() {
        throw new Error('secret getter must not execute');
      },
    },
  );
  await error(await api(request('/search?q=auto%3Aip&lang=en'), bindings), 400, 'INVALID_REQUEST');
});
test('actual file routes fail explicitly without a binding rather than calling external services', async () => {
  await error(await searchRoute({ request: request(), env: {} }), 503, 'WEATHER_UNAVAILABLE');
  await error(await forecastRoute({ request: request('/forecast?cityId=1'), env: {} }), 503, 'WEATHER_UNAVAILABLE');
});

test('cancelled POST is not misclassified as malformed user data', async () => {
  const controller = new AbortController();
  controller.abort();
  const { api, calls } = setup();
  const req = request('/forecast', {
    method: 'POST',
    signal: controller.signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ coordinates: { latitude: 31, longitude: 121, system: 'wgs84' } }),
  });
  await error(await api(req, env), 503, 'WEATHER_UNAVAILABLE');
  assert.equal(calls.length, 0);
});

for (const mode of ['utf8', 'declared-length', 'mime']) {
  test(`failed ${mode} response cancels unread data without replacing its public error`, async () => {
    let canceled = false;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0xff]));
      },
      cancel() {
        canceled = true;
        throw new Error(key);
      },
    });
    const headers = { 'content-type': mode === 'mime' ? 'text/html' : 'application/json' };
    if (mode === 'declared-length') headers['content-length'] = '524289';
    const { api } = setup(async () => new Response(body, { headers }));
    await error(await api(request(), env), 502, 'UPSTREAM_INVALID');
    assert.equal(canceled, true);
  });
}

test('forecast follows validated provider-local date when request crosses midnight', async () => {
  const started = Date.parse('2026-11-20T15:59:59Z');
  const data = forecast();
  data.location = { tz_id: 'Asia/Shanghai', localtime: '2026-11-21 00:00', localtime_epoch: started / 1000 + 2 };
  data.current.last_updated_epoch = started / 1000 - 899;
  data.current.last_updated = '2026-11-20 23:45';
  data.forecast.forecastday[0].date = '2026-11-21';
  const api = createWeatherApi({ now: () => started, fetch: async () => Response.json(data) });
  assert.equal((await api(request('/forecast?cityId=458816'), env)).status, 200);
});
test('provider-local clock older than the allowed skew cannot legitimize a stale forecast date', async () => {
  const data = forecast();
  data.location.localtime_epoch = now / 1000 - 301;
  data.location.localtime = '2026-11-20 18:24';
  const { api } = setup(async () => Response.json(data));
  await error(await api(request('/forecast?cityId=458816'), env), 502, 'UPSTREAM_INVALID');
});

test('uses the Workers-supported manual redirect mode and never follows a provider redirect', async () => {
  let calls = 0;
  const { api } = setup(async (_url, init) => {
    calls++;
    if (init.redirect === 'error') throw new TypeError('Unsupported redirect mode');
    assert.equal(init.redirect, 'manual');
    return new Response(null, { status: 307, headers: { location: 'https://example.com/untrusted' } });
  });
  await error(await api(request(), env), 502, 'UPSTREAM_INVALID');
  assert.equal(calls, 1);
});
