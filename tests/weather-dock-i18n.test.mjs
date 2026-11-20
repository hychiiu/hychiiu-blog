import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import zh from '../src/i18n/zh.ts';
import en from '../src/i18n/en.ts';
import { createWeatherDock } from '../src/scripts/weather/dock-state.ts';
const keys = ['weather.dock.currentLocation', 'weather.dock.label', 'weather.dock.summary', 'weather.dock.unavailable'];
test('Dock label vocabulary and complete composition template live in both typed UI dictionaries', () => {
  for (const dictionary of [zh, en]) {
    assert.deepEqual(
      Object.keys(dictionary)
        .filter((k) => k.startsWith('weather.dock.'))
        .sort(),
      keys,
    );
    for (const key of keys)
      assert.equal(typeof dictionary[key], key === 'weather.dock.summary' ? 'function' : 'string');
  }
  assert.equal(zh['weather.dock.summary']('北京', '晴'), '北京 · 晴 · 天气');
  assert.equal(en['weather.dock.summary']('London', 'Clear sky'), 'London · Clear sky · Weather');
  const source = readFileSync(new URL('../src/scripts/weather/dock-state.ts', import.meta.url), 'utf8');
  assert.ok(
    !/['"](?:天气|天气暂不可用|当前位置|Weather|Weather unavailable|Current location)['"]/.test(source),
    'no hardcoded new UI labels in presentation state',
  );
  assert.ok(!source.includes(' · '), 'complete visible label template belongs in dictionaries');
});
for (const [lang, dictionary] of Object.entries({ zh, en }))
  test(`Dock reads ${lang} dictionary values for neutral/failure/location/composed states`, () => {
    const { document } = parseHTML(
      `<html data-lang="${lang}"><body><button data-weather-toggle></button></body></html>`,
    );
    const dock = createWeatherDock(document),
      button = document.querySelector('button');
    const original = Object.fromEntries(keys.map((key) => [key, dictionary[key]]));
    try {
      dictionary['weather.dock.label'] = 'dictionary neutral';
      dictionary['weather.dock.unavailable'] = 'dictionary unavailable';
      dictionary['weather.dock.currentLocation'] = 'dictionary location';
      dictionary['weather.dock.summary'] = (city, condition) => `dictionary summary:${city}:${condition}`;
      dock.sync();
      assert.equal(button.getAttribute('aria-label'), 'dictionary neutral');
      dock.failed();
      assert.equal(button.getAttribute('aria-label'), 'dictionary unavailable');
      dock.success(
        { name: '@location', latitude: 0, longitude: 0 },
        { code: 1000, isDay: true, time: Math.floor(Date.now() / 1000) },
      );
      assert.equal(
        button.getAttribute('aria-label'),
        `dictionary summary:dictionary location:${lang === 'zh' ? '晴' : 'Sunny'}`,
      );
    } finally {
      for (const key of keys) dictionary[key] = original[key];
    }
  });
