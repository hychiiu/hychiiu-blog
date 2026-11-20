/** AMap is deliberately inactive until its endpoint manifest and limiter are reviewed. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { pages } from '../src/config/deploy.ts';

test('client/shared source cannot reference or configure the server-only AMap security code', () => {
  for (const directory of ['scripts', 'components', 'layouts', 'styles', 'config']) {
    const root = new URL(`../src/${directory}/`, import.meta.url);
    for (const file of readdirSync(root, { recursive: true }).filter((path) =>
      /\.(?:[cm]?[jt]s|astro|css)$/.test(path),
    )) {
      const source = readFileSync(new URL(file, root), 'utf8');
      assert.doesNotMatch(source, /BLOG_AMAP_SECURITY_JS_CODE|securityJsCode\s*:/, `${directory}/${file}`);
    }
  }
});

test('unverified AMap proxy is not activated by production invocation routes', () => {
  assert.equal(
    pages.functionRoutes.some((path) => path.includes('_AMapService')),
    false,
  );
  const middleware = readFileSync(new URL('../functions/_middleware.js', import.meta.url), 'utf8');
  assert.doesNotMatch(middleware, /restapi\.amap\.com|webapi\.amap\.com|BLOG_AMAP_SECURITY_JS_CODE/);
});
