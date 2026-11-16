/**
 * Render the markdown fixture through the Expressive Code engine (same
 * plugins as the site) and assert toolbar HTML structure. No public
 * /dev preview route and no browser.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, test } from 'node:test';
import { ExpressiveCodeEngine } from '@expressive-code/core';
import { pluginFrames } from '@expressive-code/plugin-frames';
import { pluginCodeToolbar } from '../src/markdown/code-toolbar.mjs';

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/codeblock-samples.md');

function parseFences(markdown) {
  const fences = [];
  const re = /```([^\n`]*)\n([\s\S]*?)```/g;
  for (const match of markdown.matchAll(re)) {
    const info = match[1].trim();
    const [language, ...rest] = info.split(/\s+/);
    fences.push({
      language: language || 'plaintext',
      meta: rest.join(' '),
      code: match[2].replace(/\n$/, ''),
    });
  }
  return fences;
}

function figureHtml(html) {
  return [...html.matchAll(/<figure\b[\s\S]*?<\/figure>/g)].map((m) => m[0]);
}

let html;
let figures;

before(async () => {
  const engine = new ExpressiveCodeEngine({
    plugins: [pluginFrames(), pluginCodeToolbar()],
    useDarkModeMediaQuery: false,
    defaultProps: { showLineNumbers: false, wrap: true, frame: 'code' },
  });
  const fences = parseFences(readFileSync(fixturePath, 'utf8'));
  assert.equal(fences.length, 7, 'fixture should keep seven sample fences');
  const parts = [];
  for (const fence of fences) {
    const { renderedGroupAst } = await engine.render(fence);
    const { toHtml } = await import('@expressive-code/core/hast');
    parts.push(toHtml(renderedGroupAst));
  }
  html = parts.join('\n');
  figures = figureHtml(html);
});

test('夹具渲染出的每块代码都带 has-toolbar，复制按钮在 figcaption 内', () => {
  assert.equal(figures.length, 7);
  for (const fig of figures) {
    assert.match(fig, /class="[^"]*\bhas-toolbar\b/);
    const cap = fig.match(/<figcaption class="header">[\s\S]*?<\/figcaption>/);
    assert.ok(cap, fig.slice(0, 180));
    assert.match(cap[0], /<div class="copy">/);
    assert.match(cap[0], /aria-label="/);
    assert.doesNotMatch(fig.replace(cap[0], ''), /<div class="copy">/);
  }
});

test('夹具覆盖有标题、无标题、terminal 与语言标签', () => {
  assert.match(html, /class="[^"]*\bhas-title\b/);
  assert.match(html, /class="[^"]*\bis-terminal\b/);
  assert.match(html, /<span class="lang">BASH<\/span>/);
  assert.match(html, /<span class="lang">JS<\/span>/);
  assert.match(html, /<span class="lang">PLAINTEXT<\/span>/);
  assert.match(html, /title="src\/hello\.ts"/);
  assert.match(html, /title="VPS · docker-compose\.yml/);
  assert.match(html, /网关 · 从官方 apt 源安装 sing-box/);
  assert.match(html, /示例终端/);
  const untitled = figures.filter((fig) => !/\bhas-title\b/.test(fig));
  assert.ok(untitled.length >= 2, 'expected untitled js and plaintext samples');
  for (const fig of untitled) {
    assert.match(fig, /\bhas-toolbar\b/);
    assert.match(fig, /<figcaption class="header">/);
  }
});

test('关闭换行的示例保留长行，供横滚检查', () => {
  const long = figures.find((fig) => fig.includes('example.com/api/v1/widgets?limit=100'));
  assert.ok(long, 'missing wrap=false sample');
  assert.doesNotMatch(long, /<pre[^>]*\bclass="[^"]*\bwrap\b/);
});
