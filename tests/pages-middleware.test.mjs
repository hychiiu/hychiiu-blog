import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../functions/_middleware.js';
import { pages } from '../src/config/deploy.ts';
import { BUILD_ID } from '../functions/_build.js';

function setup(path, assetResponse = new Response('asset')) {
  const calls = { assets: [], next: 0 };
  const context = {
    request: new Request(`https://hychiiu.com${path}`),
    env: {
      ASSETS: {
        fetch(request) {
          calls.assets.push(request);
          return assetResponse;
        },
      },
    },
    next() {
      calls.next++;
      return new Response('delegated', { status: 404 });
    },
  };
  return { calls, context };
}

for (const prefix of ['/posts/', '/notes/', '/tags/', '/en/posts/', '/en/notes/', '/en/tags/']) {
  test(`content cache ownership remains scoped to ${prefix}`, async () => {
    const { calls, context } = setup(`${prefix}example/?visible=1`);
    const response = await onRequest(context);
    assert.equal(await response.text(), 'asset');
    assert.equal(calls.next, 0);
    assert.equal(calls.assets.length, 1);
    const internal = new URL(calls.assets[0].url);
    assert.equal(internal.pathname, `${prefix}example/`);
    assert.equal(internal.searchParams.get(pages.cacheKeyParam), BUILD_ID);
    assert.equal(internal.searchParams.get('visible'), '1');
  });
}

for (const path of [
  '/',
  '/posts-evil/',
  '/api/weather/search',
  '/api/weather/forecast',
  '/_AMapService/v3/ip',
  '/_AMapService/v3/geocode/regeo',
]) {
  test(`non-content request delegates without an ASSETS request: ${path}`, async () => {
    const { calls, context } = setup(path);
    const response = await onRequest(context);
    assert.equal(calls.assets.length, 0);
    assert.equal(calls.next, 1);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), 'delegated');
  });
}

test('deleted content remains a real 404', async () => {
  const expected = new Response('not found', { status: 404 });
  const { context, calls } = setup('/posts/deleted/', expected);
  assert.equal(await onRequest(context), expected);
  assert.equal(calls.next, 0);
});

test('content redirect strips only the internal cache parameter', async () => {
  const { context } = setup(
    '/posts/example',
    new Response(null, {
      status: 308,
      headers: { location: `https://hychiiu.com/posts/example/?visible=1&${pages.cacheKeyParam}=${BUILD_ID}#section` },
    }),
  );
  const response = await onRequest(context);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/posts/example/?visible=1#section');
});

test('config distinguishes original versioned prefixes from the future invocation scope', () => {
  const prefixes = ['/posts/', '/notes/', '/tags/', '/en/posts/', '/en/notes/', '/en/tags/'];
  assert.deepEqual(pages.versionedPrefixes, prefixes);
  assert.deepEqual(pages.functionRoutes, [
    ...prefixes.map((prefix) => `${prefix}*`),
    '/api/weather/search',
    '/api/weather/forecast',
  ]);
  assert.equal(
    pages.functionRoutes.some((route) => route.includes('_AMapService')),
    false,
  );
});
