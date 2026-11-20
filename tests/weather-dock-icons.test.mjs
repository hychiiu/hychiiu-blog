import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
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
test('default and unknown use approved neutral cloud/thermometer, not clear sky', () => {
  assert.equal(inner(dockWeatherIcon()), fixture.paths.unknown);
  assert.notEqual(dockWeatherIcon(), dockWeatherIcon('sun'));
});
test('every documented condition code maps to an approved v2 glyph, including 97 and unknown', () => {
  const groups = {
    sun: [0],
    partly: [1, 2],
    cloud: [3],
    fog: [45, 48],
    rain: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82],
    snow: [71, 73, 75, 77, 85, 86],
    storm: [95, 96, 97, 99],
    unknown: [999],
  };
  for (const [icon, codes] of Object.entries(groups))
    for (const code of codes) {
      assert.equal(condition(code, 'zh').icon, icon);
      assert.equal(inner(dockWeatherIcon(condition(code, 'en').icon)), fixture.paths[icon]);
    }
  assert.equal(inner(dockWeatherIcon(condition(0, 'en', false).icon)), fixture.paths.moon);
});
test('clear day sun/thermometer and clear night crescent/two-stars cannot reuse theme icons', () => {
  const theme = readFileSync(new URL('../src/components/Icon.astro', import.meta.url), 'utf8');
  const sun = theme.match(/'sun-line':\s*'([^']+)'/)[1],
    moon = theme.match(/'moon-line':\s*'([^']+)'/)[1];
  assert.notEqual(inner(dockWeatherIcon('sun')), sun);
  assert.notEqual(inner(dockWeatherIcon('moon')), moon);
  assert.match(inner(dockWeatherIcon('sun')), /16\.520 5\.700/);
  assert.equal(
    (inner(dockWeatherIcon('moon')).match(/<path/g) || []).length,
    3,
    'crescent plus exactly two star paths',
  );
});
