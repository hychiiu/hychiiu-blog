import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('Dock weather precedes language/theme, is a button and never page navigation', () => {
  const dock = read('src/components/Dock.astro');
  assert.match(
    dock,
    /<button[\s\S]*?data-weather-toggle[\s\S]*?aria-expanded="false"[\s\S]*?aria-controls="weather-panel"/,
  );
  assert.ok(dock.indexOf('data-weather-toggle') < dock.indexOf('data-dock-lang'));
  assert.ok(dock.indexOf('data-dock-lang') < dock.indexOf('data-theme-toggle'));
  assert.match(dock, /role="dialog"/);
  assert.match(dock, /transition:persist="weather"/);
  assert.match(dock, /scripts\/weather/);
});
test('panel uses paper tokens, common 20px inset and no mobile Dock overlap', () => {
  const css = read('src/styles/weather.css'),
    tokens = read('src/styles/tokens.css');
  assert.match(tokens, /--weather-pad: 20px/);
  assert.match(tokens, /--weather-width: 280px/);
  assert.match(css, /padding: var\(--weather-pad\)/);
  assert.match(css, /background: var\(--paper\)/);
  assert.match(css, /bottom: calc\(var\(--dock-bar-clear\)/);
  assert.match(css, /\[hidden\]/);
  assert.match(css, /prefers-reduced-motion/);
});
test('narrow Dock keeps physical targets, allows scroll instead of page overflow', () => {
  const css = read('src/styles/dock.css');
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /flex-shrink: 0/);
  assert.match(css, /max-width: calc\(100vw/);
});

test('article weather panel reserves the existing back-to-top control zone', () => {
  const css = read('src/styles/weather.css');
  assert.ok(css.includes('body:has([data-to-top]) .weather-panel'), 'article-specific clearance is required');
  assert.ok(css.includes('var(--to-top-size)'), 'clearance must include the existing control height');
});

test('shared top-button token does not couple unrelated article avatar sizing', () => {
  const article = read('src/layouts/Article.astro');
  assert.match(article, /\.post-author img\s*\{\s*width: 36px;/);
});
