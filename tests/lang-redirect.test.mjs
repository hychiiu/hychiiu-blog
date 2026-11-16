import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const base = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');
const boot = base.slice(
  base.indexOf('<script is:inline>'),
  base.indexOf('</script>', base.indexOf('<script is:inline>')),
);
const bootCode = boot.replace(/\/\/.*$/gm, '');
const controls = readFileSync(new URL('../src/scripts/controls.ts', import.meta.url), 'utf8');

test('首次加载不会按 localStorage 语言记忆改写当前永久链接', () => {
  assert.match(boot, /window\.__yhBoot/);
  assert.doesNotMatch(bootCode, /location\.replace/);
  assert.doesNotMatch(bootCode, /localStorage\.getItem\(\s*['"]lang['"]\s*\)/);
  assert.match(boot, /永久链接|优先于/);
});

test('语言记忆只在 Dock 点击时写入，不在引导脚本里强制跳转', () => {
  assert.match(controls, /localStorage\.setItem\(\s*['"]lang['"]/);
  assert.match(controls, /data-set-lang|dataset\.setLang/);
  assert.doesNotMatch(controls, /location\.replace/);
});
