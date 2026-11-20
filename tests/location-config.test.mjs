import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../functions/api/weather/location-config.js';

const path = '/api/weather/location-config';
const enabled = () => ({ BLOG_AMAP_LOCATION_ENABLED: 'true', BLOG_AMAP_JS_API_KEY: 'test-public-key' });
function invoke(url = `https://hychiiu.com${path}`, env = enabled(), options = {}) {
  return onRequest({ request: new Request(url, options), env });
}
async function expectError(response, status, code) {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { code });
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.has('access-control-allow-origin'), false);
}

for (const origin of ['https://hychiiu.com', 'https://inbluemoon.com']) {
  test(`enabled configuration returns only public fields for ${origin}`, async () => {
    const env = enabled();
    Object.defineProperty(env, 'BLOG_AMAP_SECURITY_JS_CODE', {
      get() {
        throw Error('must not read private binding');
      },
    });
    const response = invoke(`${origin}${path}`, env, {
      headers: { Origin: origin, Referer: `${origin}/posts/example/`, 'Sec-Fetch-Site': 'same-origin' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { jsApiKey: 'test-public-key', serviceHost: `${origin}/_AMapService` });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.has('access-control-allow-origin'), false);
  });
}

for (const flag of [undefined, '', 'false', 'TRUE', '1']) {
  test(`feature remains unavailable unless explicitly enabled: ${String(flag)}`, async () => {
    const reads = [];
    const env = new Proxy(
      { BLOG_AMAP_LOCATION_ENABLED: flag },
      {
        get(object, key) {
          reads.push(key);
          if (key === 'BLOG_AMAP_JS_API_KEY') throw Error('disabled endpoint must not read key');
          return object[key];
        },
      },
    );
    await expectError(invoke(undefined, env), 503, 'LOCATION_UNAVAILABLE');
    assert.deepEqual(reads, ['BLOG_AMAP_LOCATION_ENABLED']);
  });
}

for (const origin of [
  'http://hychiiu.com',
  'https://preview.hychiiu-blog.pages.dev',
  'https://hychiiu-blog.pages.dev',
  'https://www.inbluemoon.com',
  'https://hychiiu.com.example.org',
  'https://hychiiu.com:8443',
]) {
  test(`rejects non-production origin before reading runtime configuration: ${origin}`, async () => {
    const env = new Proxy(
      {},
      {
        get() {
          throw Error('untrusted request must not inspect env');
        },
      },
    );
    await expectError(invoke(`${origin}${path}`, env), 403, 'FORBIDDEN');
  });
}

for (const headers of [
  { Origin: 'https://inbluemoon.com' },
  { Origin: 'null' },
  { Origin: 'https://hychiiu.com/invalid-origin-path' },
  { Referer: 'https://other.example/' },
  { Referer: 'not a URL' },
  { Referer: 'https://user:password@hychiiu.com/' },
  { 'Sec-Fetch-Site': 'cross-site' },
  { 'Sec-Fetch-Site': 'same-site' },
]) {
  test(`rejects cross-origin or malformed source metadata: ${JSON.stringify(headers)}`, async () => {
    await expectError(invoke(undefined, enabled(), { headers }), 403, 'FORBIDDEN');
  });
}

for (const query of ['?key=untrusted', '?jscode=untrusted', '?target=https://other.example/', '?location=1,2']) {
  test(`rejects query input without echo: ${query.split('=')[0]}`, async () => {
    await expectError(invoke(`https://hychiiu.com${path}${query}`), 400, 'INVALID_REQUEST');
  });
}

for (const method of ['POST', 'PUT', 'OPTIONS', 'HEAD']) {
  test(`rejects unsupported method ${method}`, async () => {
    const response = invoke(undefined, enabled(), { method });
    assert.equal(response.headers.get('allow'), 'GET');
    await expectError(response, 405, 'METHOD_NOT_ALLOWED');
  });
}

for (const key of [undefined, '', '  ', ' test-public-key', 'test public key', 'x'.repeat(257), null, 42]) {
  test(`missing or invalid binding yields a fixed error (${typeof key}/${key?.length ?? 0})`, async () => {
    await expectError(
      invoke(undefined, { BLOG_AMAP_LOCATION_ENABLED: 'true', BLOG_AMAP_JS_API_KEY: key }),
      503,
      'LOCATION_UNAVAILABLE',
    );
  });
}

test('wrong path is not treated as a generic API or proxy', async () => {
  await expectError(invoke('https://hychiiu.com/_AMapService/v3/ip'), 404, 'NOT_FOUND');
});

test('direct HTTP client metadata remains defense in depth, not claimed authentication', async () => {
  assert.equal(invoke().status, 200);
  assert.equal(invoke(undefined, enabled(), { headers: { 'Sec-Fetch-Site': 'none' } }).status, 200);
});
