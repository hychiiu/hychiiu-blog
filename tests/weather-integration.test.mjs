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

test('Dock weather starts neutral with its own v2 renderer, independent from theme controls', () => {
  const dock = read('src/components/Dock.astro');
  const entrance = dock.match(/<button[^>]*data-weather-toggle[\s\S]*?<\/button>/)?.[0];
  assert.ok(entrance, 'weather tool must remain a distinct button');
  assert.ok(entrance.includes('dockWeatherIcon()'), 'neutral SSR glyph must not invent initial conditions');
  assert.ok(!entrance.includes('i-sun') && !entrance.includes('i-moon'));
  assert.ok(
    dock.includes('name="sun-line"') && dock.includes('name="moon-line"'),
    'existing theme icons stay unchanged',
  );
});

test('search row keeps the submit button on one line at 38px', () => {
  const css = read('src/styles/weather.css');
  assert.match(css, /\.weather-search-row\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.weather-search-row input\s*\{[^}]*flex:\s*1 1 0%/);
  assert.match(css, /\.weather-search-row input\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.weather-search-row input\s*\{[^}]*width:\s*auto/);
  assert.match(css, /\.weather-search-row input\s*\{[^}]*height:\s*var\(--weather-target\)/);
  assert.match(css, /\.weather-search-row \.weather-button\s*\{[^}]*flex:\s*0 0 auto/);
  assert.match(css, /\.weather-search-row \.weather-button\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.weather-panel button\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.weather-status-slot\s*\{[^}]*min-height:/);
  assert.equal(/\.weather-status-slot[^}]*transition:[^}]*height/.test(css), false);
  assert.match(css, /\.weather-candidates\s*\{[^}]*max-height:\s*30dvh/);
  assert.match(css, /\.weather-candidates\s*\{[^}]*overflow:\s*auto/);
  assert.equal(/\.weather-candidates\s*\{[^}]*overflow-x:\s*hidden/.test(css), false);
  assert.match(css, /\.weather-candidates button\s*\{[^}]*white-space:\s*normal/);
  assert.match(css, /\.weather-candidates button\s*\{[^}]*overflow-wrap:\s*anywhere/);
});

test('language control uses the approved translate glyph and never writes 中/EN into it', () => {
  const dock = read('src/components/Dock.astro');
  const script = read('src/scripts/dock.ts');
  const icon = read('src/components/Icon.astro');
  assert.match(icon, /'lang-translate':/);
  assert.match(icon, /M4\.1 18L7\.7 6\.7L11\.3 18/);
  assert.match(icon, /M13\.3 11\.35L20\.8 18\.2/);
  assert.match(dock, /name="lang-translate"/);
  assert.doesNotMatch(dock, /data-glyph/);
  assert.doesNotMatch(script, /data-glyph/);
  assert.doesNotMatch(script, /locales\[other\]\.short/);
  assert.match(script, /langLink\.hreflang/);
  assert.match(script, /dataset\.setLang/);
});

test('desktop tooltip channels are independent and reduced-motion tips do not slide 4px', () => {
  const css = read('src/styles/dock.css');
  assert.match(css, /:not\(\.is-tip-pointer-suppressed\)/);
  assert.match(css, /:not\(\.is-tip-focus-suppressed\)/);
  assert.match(css, /\.dock-btn:focus-visible/);
  assert.match(
    css,
    /\.dock\.is-tip-pointer-suppressed\s+\.dock-floating-tip\s*,\s*\.dock\.is-tip-focus-suppressed\s+\.dock-floating-tip\s*\{[^}]*opacity:\s*0[^}]*transition:\s*none/,
  );
  assert.doesNotMatch(css, /translate\(-4px/);
  assert.doesNotMatch(css, /translate\(-50%, 4px\)/);
  const script = read('src/scripts/dock.ts');
  assert.match(script, /addEventListener\(\s*'pointerdown'[\s\S]*noteDockPointer/);
  assert.match(script, /addEventListener\(\s*'pointerover'[\s\S]*noteDockPointer/);
});

test('viewport leave clears last pointer on documentElement, not a bubbling window listener', () => {
  const script = read('src/scripts/dock.ts');
  // pointerleave does not bubble; leaving the viewport targets <html>.
  assert.match(script, /document\.documentElement\.addEventListener\(\s*'pointerleave'[\s\S]*?clearDockPointer/);
  assert.doesNotMatch(script, /window\.addEventListener\(\s*'pointerleave'/);
});
