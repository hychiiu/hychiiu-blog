import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { dockWeatherIcon } from '../src/scripts/weather/dock-icons.ts';
import { condition } from '../src/scripts/weather/service.ts';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/weather-dock-v2.json', import.meta.url), 'utf8'));
const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
for (const [name, body] of Object.entries(fixture.paths))
  test(`approved v2 ${name} path is exact, 20px, round 1.5 in 24 viewbox`, () => {
    const svg = dockWeatherIcon(name);
    assert.equal(inner(svg), body);
    for (const attr of [
      'viewBox="0 0 24 24"',
      'width="20"',
      'height="20"',
      'stroke="currentColor"',
      'stroke-width="1.5"',
      'stroke-linecap="round"',
      'stroke-linejoin="round"',
      'fill="none"',
    ])
      assert.ok(svg.includes(attr), attr);
  });
test('default and unknown use approved neutral gap-cloud/short-dash, not clear sky', () => {
  assert.equal(inner(dockWeatherIcon()), fixture.paths.unknown);
  assert.notEqual(dockWeatherIcon(), dockWeatherIcon('sun'));
});
test('every documented WeatherAPI condition code maps to an approved v2 glyph, including 1036/1063 and unknown', () => {
  const groups = {
    sun: [1000],
    partly: [1003],
    cloud: [1006, 1009],
    fog: [1012, 1030, 1036, 1135, 1147],
    rain: [1063, 1069, 1183, 1189, 1195, 1240],
    snow: [1066, 1117, 1213, 1225, 1237],
    storm: [1087, 1273, 1276, 1279, 1282],
    unknown: [999, 0, 61],
  };
  for (const [icon, codes] of Object.entries(groups))
    for (const code of codes) {
      assert.equal(condition(code, 'zh').icon, icon);
      assert.equal(inner(dockWeatherIcon(condition(code, 'en').icon)), fixture.paths[icon]);
    }
  assert.equal(inner(dockWeatherIcon(condition(1000, 'en', false).icon)), fixture.paths.moon);
});
test('clear day half-sun and clear night full-moon/shallow-arc cannot reuse theme icons', () => {
  const theme = readFileSync(new URL('../src/components/Icon.astro', import.meta.url), 'utf8');
  const sun = theme.match(/'sun-line':\s*'([^']+)'/)[1],
    moon = theme.match(/'moon-line':\s*'([^']+)'/)[1];
  assert.notEqual(inner(dockWeatherIcon('sun')), sun);
  assert.notEqual(inner(dockWeatherIcon('moon')), moon);
  assert.equal(inner(dockWeatherIcon('sun')), fixture.paths.sun);
  assert.match(inner(dockWeatherIcon('sun')), /M5\.65 13\.55A6\.35 6\.35/);
  assert.equal(
    (inner(dockWeatherIcon('sun')).match(/<path/g) || []).length,
    2,
    'half solar arc and rays, without horizon',
  );
  assert.match(inner(dockWeatherIcon('moon')), /<circle cx="12" cy="12" r="7"\/>/);
  assert.equal(
    (inner(dockWeatherIcon('moon')).match(/<path/g) || []).length,
    1,
    'full moon with one shallow arc, no stars',
  );
});

test('designer v2 snow uses two six-way stroke crystals and unknown uses a gap cloud plus short dash', () => {
  const svg = dockWeatherIcon('snow');
  assert.equal((inner(svg).match(/<path/g) || []).length, 3);
  assert.equal(inner(svg).includes('<circle'), false, 'snow must not turn into rain/hail dots');
  assert.equal(svg.includes('fill="currentColor"'), false, 'stroke crystals, not filled dots');
  assert.match(inner(dockWeatherIcon()), /M10\.215 15\.25/);
  assert.match(inner(dockWeatherIcon()), /M10\.425 10\.914L13\.575 10\.914/);
});

test('all designer v2 strokes/circles inherit currentColor in light and dark wrappers, with no black or fixed-color dots', () => {
  for (const color of ['#5c5a55', '#d0cec6'])
    for (const icon of Object.keys(fixture.paths)) {
      const svg = dockWeatherIcon(icon);
      assert.match(svg, /stroke="currentColor"/);
      assert.match(svg, /fill="none"/);
      const paints = [...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((match) => match[1]);
      assert.ok(
        paints.every((p) => ['none', 'currentColor'].includes(p)),
        `${icon}: no fixed-color paints on ${color}`,
      );
      assert.ok(!/<(?:circle|path)[^>]*(?:style|color)=/.test(svg), 'no per-child color override');
      const { document } = parseHTML(`<div style="color:${color}">${svg}</div>`);
      const glyph = document.querySelector('svg');
      assert.equal(glyph.parentElement.style.color, color);
      assert.equal(glyph.style.color, '');
      for (const child of glyph.querySelectorAll('circle,path'))
        assert.ok(!child.hasAttribute('fill') || ['none', 'currentColor'].includes(child.getAttribute('fill')));
    }
});
