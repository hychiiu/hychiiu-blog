/**
 * 方案 A：代码块单行工具栏（标题左、语言+复制右）
 * 用 Expressive Code 引擎 + plugin-frames 做结构断言，不启动浏览器。
 */
import assert from 'node:assert/strict';
import { test, before } from 'node:test';
import { ExpressiveCodeEngine } from '@expressive-code/core';
import { pluginFrames } from '@expressive-code/plugin-frames';
import { toHtml, select, selectAll, toText } from '@expressive-code/core/hast';
import { pluginCodeToolbar } from './code-toolbar.mjs';

async function render(code, { language = 'js', meta = '' } = {}) {
  const engine = new ExpressiveCodeEngine({
    plugins: [pluginFrames(), pluginCodeToolbar()],
    useDarkModeMediaQuery: false,
  });
  const { renderedGroupAst } = await engine.render({ code, language, meta });
  return { ast: renderedGroupAst, html: toHtml(renderedGroupAst) };
}

function frameOf(ast) {
  return select('figure.frame, .frame', ast) ?? ast;
}

let titled;
let untitled;
let plain;
let terminal;

before(async () => {
  titled = await render('const n = 1\n', { language: 'js', meta: 'title="src/hello.ts"' });
  untitled = await render('const n = 1\n', { language: 'bash' });
  plain = await render('hello world\n', { language: 'plaintext' });
  terminal = await render('echo hi\n', { language: 'bash', meta: 'frame="terminal" title="示例终端"' });
});

test('有标题时：工具栏含标题、大写语言，并把复制按钮移进页眉', () => {
  const frame = frameOf(titled.ast);
  const classNames = (frame.properties?.className ?? []).join(' ');
  assert.match(classNames, /has-toolbar/);
  assert.match(classNames, /has-title/);

  const title = select('.header .title', frame);
  assert.ok(title, '应有标题节点');
  assert.equal(toText(title).trim(), 'src/hello.ts');
  assert.equal(title.properties?.title, 'src/hello.ts');

  const lang = select('.header .lang', frame);
  assert.ok(lang, '应有语言标签');
  assert.equal(toText(lang).trim(), 'JS');

  const copyInHeader = select('.header .copy button', frame);
  assert.ok(copyInHeader, '复制按钮应在工具栏内，而不是叠在代码上');
  assert.equal(selectAll('.frame > .copy', frame).length, 0);
});

test('无标题时：仍显示工具栏和语言，不编造标题', () => {
  const frame = frameOf(untitled.ast);
  const classNames = (frame.properties?.className ?? []).join(' ');
  assert.match(classNames, /has-toolbar/);
  assert.doesNotMatch(classNames, /has-title/);

  const title = select('.header .title', frame);
  assert.ok(!title || toText(title).trim() === '', '无 title 时不应出现可见标题');

  const lang = select('.header .lang', frame);
  assert.equal(toText(lang).trim(), 'BASH');
  assert.ok(select('.header .copy button', frame), '无标题时仍可复制');
});

test('无围栏语言时，语言标签为 PLAINTEXT', () => {
  const lang = select('.header .lang', frameOf(plain.ast));
  assert.ok(lang);
  assert.equal(toText(lang).trim(), 'PLAINTEXT');
});

test('显式 terminal 也使用同一套工具栏，且保留复制', () => {
  const frame = frameOf(terminal.ast);
  const classNames = (frame.properties?.className ?? []).join(' ');
  assert.match(classNames, /is-terminal/);
  assert.match(classNames, /has-toolbar/);
  assert.equal(toText(select('.header .title', frame)).trim(), '示例终端');
  assert.equal(toText(select('.header .lang', frame)).trim(), 'BASH');
  assert.ok(select('.header .copy button', frame));
});

test('复制按钮有可访问名称', () => {
  const button = select('.header .copy button', frameOf(titled.ast));
  const name = `${button.properties?.title ?? ''} ${button.properties?.['aria-label'] ?? ''}`;
  assert.match(name, /copy/i);
});
