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

test('令牌：点击区 32px、图标 13px、工具栏上/右 inset 与代码左右内边距相同', () => {
  assert.match(tokens, /--code-toolbar-h:\s*32px/);
  assert.match(tokens, /--code-copy-size:\s*32px/);
  assert.match(tokens, /--code-copy-icon:\s*13px/);
  assert.match(tokens, /--code-toolbar-inset:\s*var\(--code-pad-x\)/);
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

test('工具栏上、右内边距使用同一 inset，为 32px 点击区留出真实盒模型空间', () => {
  assert.match(
    css,
    /\.has-toolbar\s+\.header[\s\S]{0,400}padding:[^;]*var\(--code-toolbar-inset\)[^;]*var\(--code-toolbar-inset\)/,
  );
  assert.match(
    css,
    /\.has-toolbar\s+\.header[\s\S]{0,400}min-height:\s*calc\(var\(--code-copy-size\)\s*\+\s*var\(--code-toolbar-inset\)\)/,
  );
  const untitledHeader = css.match(/\.has-toolbar:not\(\.has-title\)\s+\.header\s*\{[^}]+\}/);
  if (untitledHeader) {
    assert.doesNotMatch(untitledHeader[0], /padding:\s*0\s+var\(--code-pad-x\)/);
  }
});

test('明确覆盖 EC 默认按钮外壳：去掉原生外观、边框、阴影与内部装饰层', () => {
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,500}appearance:\s*none/);
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,500}box-shadow:\s*none/);
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,500}border:\s*0/);
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,500}background:\s*transparent/);
  assert.match(css, /button::before[\s\S]{0,200}(?:box-shadow:\s*none|border:\s*0|background:\s*none|opacity:\s*0)/);
  assert.match(css, /\.copy\s+button\s+div[\s\S]{0,200}(?:box-shadow:\s*none|background:\s*none|opacity:\s*0)/);
});

test('精细指针设备默认隐藏复制图标，悬停整块或键盘/成功态时显示，并保留占位', () => {
  assert.match(css, /@media\s*\(hover:\s*hover\)\s+and\s*\(pointer:\s*fine\)/);
  const fine = css.match(/@media\s*\(hover:\s*hover\)\s+and\s*\(pointer:\s*fine\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(fine, 'missing hover:hover and pointer:fine query');
  assert.match(fine[1], /\.copy\s+button[\s\S]{0,200}opacity:\s*0/);
  assert.match(fine[1], /:hover[\s\S]{0,400}\.copy\s+button[\s\S]{0,400}opacity:\s*1/);
  assert.match(fine[1], /:focus-within[\s\S]{0,400}\.copy\s+button[\s\S]{0,400}opacity:\s*1/);
  assert.match(fine[1], /button:focus-visible[\s\S]{0,400}opacity:\s*1/);
  assert.match(fine[1], /feedback\.show[\s\S]{0,400}opacity:\s*1/);
  assert.doesNotMatch(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,200}display:\s*none/);
  const none = css.match(/@media\s*\(hover:\s*none\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(none, 'missing hover:none query');
  assert.match(none[1], /\.copy\s+button[\s\S]{0,200}opacity:\s*1/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]{0,400}\.copy[\s\S]{0,200}transition:\s*none/);
});

test('DESIGN.md §7 已改为单行工具栏，无标题栏在文档流中保留高度且不叠字', () => {
  assert.match(design, /单行工具栏|语言.*复制/);
  assert.match(design, /复制图标/);
  assert.match(design, /文档流/);
  assert.match(design, /上.*右.*inset|相同.*内边距|上、右/);
  assert.match(design, /hover|悬停/);
  assert.doesNotMatch(design, /右侧沟槽/);
  assert.doesNotMatch(design, /文件名为右上角 mono `--fs-xs` 弱色小标签；复制按钮为 hover 才出现的幽灵图标/);
});
