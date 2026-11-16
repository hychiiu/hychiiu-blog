/**
 * 首页 hero：仅断言移动端英文名与中文名的垂直间距（源码），不启动浏览器。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(join(root, 'src/views/Home.astro'), 'utf8');

const mobile = home.match(/@media \(max-width: 480px\) \{([\s\S]*?)\n {2}\}/);
assert.ok(mobile, 'expected a max-width: 480px hero block');

test('移动端英文名与中文名有 8–12px 级的明确垂直间距，并放宽行高', () => {
  const block = mobile[1];
  assert.match(block, /\.nm\s*\{[\s\S]*?line-height:\s*1\.15/);
  assert.match(block, /\.cn\s*\{[\s\S]*?margin:\s*var\(--sp-3\)/);
  assert.match(block, /\.cn\s*\{[\s\S]*?line-height:\s*1\.2/);
  // 桌面：中文名仍在同一行，左边距保持 18px，不被移动端规则覆盖到默认样式
  const desktopCn = home.match(/^\s+\.cn \{\n(?:.*\n)*?\s+\}\n/m);
  assert.ok(desktopCn, 'desktop .cn rule missing');
  assert.match(desktopCn[0], /margin-left:\s*18px/);
  assert.match(desktopCn[0], /display:\s*inline-block/);
  assert.doesNotMatch(desktopCn[0], /max-width/);
});
