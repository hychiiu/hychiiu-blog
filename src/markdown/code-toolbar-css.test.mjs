/**
 * 方案 A 样式回归：断言 DESIGN 令牌与 markdown.css 中的关键规则已落地。
 * 不计算浏览器实际布局，只保证样式源里写了这些约束。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const tokens = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
const css = readFileSync(join(root, 'src/styles/markdown.css'), 'utf8');
const design = readFileSync(join(root, 'docs/DESIGN.md'), 'utf8');

test('令牌：有标题栏 32px、复制点击区 32px、图标 13px', () => {
  assert.match(tokens, /--code-toolbar-h:\s*32px/);
  assert.match(tokens, /--code-copy-size:\s*32px/);
  assert.match(tokens, /--code-copy-icon:\s*13px/);
});

test('工具栏为单行 flex，标题截断，语言在右侧', () => {
  assert.match(css, /\.has-toolbar\s+\.header[\s\S]{0,400}display:\s*flex/);
  assert.match(css, /\.has-toolbar[\s\S]{0,800}\.title[\s\S]{0,400}text-overflow:\s*ellipsis/);
  assert.match(css, /\.has-toolbar[\s\S]{0,1200}\.lang[\s\S]{0,400}text-transform:\s*uppercase/);
  assert.match(css, /\.has-toolbar[\s\S]{0,1200}\.lang[\s\S]{0,400}margin-left:\s*auto/);
  assert.match(css, /color:\s*var\(--ink-muted\)/);
});

test('复制按钮保留 32px 点击区，图标用更小的视觉尺寸，成功反馈不占文档流', () => {
  assert.match(css, /\.has-toolbar\s+\.copy\s*\{[\s\S]{0,200}position:\s*relative/);
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,300}min-width:\s*var\(--code-copy-size\)/);
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,300}min-height:\s*var\(--code-copy-size\)/);
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,300}border-radius:\s*var\(--r-round\)/);
  assert.match(css, /\.has-toolbar[\s\S]{0,2000}button::after[\s\S]{0,300}--code-copy-icon/);
  assert.match(css, /\.has-toolbar[\s\S]{0,2000}\.feedback[\s\S]{0,200}position:\s*absolute/);
});

test('无标题工具栏保持文档流，不为代码行加固定右侧大内边距', () => {
  const untitledHeader = css.match(/\.has-toolbar:not\(\.has-title\)\s+\.header\s*\{[^}]+\}/);
  assert.ok(untitledHeader, 'missing untitled header rule');
  assert.doesNotMatch(untitledHeader[0], /position:\s*absolute/);
  assert.doesNotMatch(css, /--code-toolbar-gutter/);
  assert.doesNotMatch(tokens, /--code-toolbar-gutter/);
  // untitled pre should not start as if the overlay sits on top of code-pad-y
  assert.doesNotMatch(css, /\.has-toolbar:not\(\.has-title\)\s+pre[\s\S]{0,200}padding-top:\s*var\(--code-pad-y\)/);
});

test('焦点环使用强调色，终端框圆点被关掉', () => {
  assert.match(css, /\.has-toolbar\s+\.copy\s+button:focus-visible[\s\S]{0,300}outline:[^;]*var\(--accent\)/);
  assert.match(
    css,
    /\.has-toolbar(?:\.is-terminal|\.is-terminal \.header|\s+\.header)::before[\s\S]{0,80}display:\s*none|\.is-terminal\.has-toolbar \.header::before[\s\S]{0,80}display:\s*none|\.has-toolbar\.is-terminal \.header::before[\s\S]{0,80}display:\s*none/,
  );
});

test('DESIGN.md §7 已改为单行工具栏，无标题栏在文档流中保留高度且不叠字', () => {
  assert.match(design, /单行工具栏|语言.*复制/);
  assert.match(design, /复制图标/);
  assert.match(design, /文档流/);
  assert.doesNotMatch(design, /右侧沟槽/);
  assert.doesNotMatch(design, /文件名为右上角 mono `--fs-xs` 弱色小标签；复制按钮为 hover 才出现的幽灵图标/);
});
