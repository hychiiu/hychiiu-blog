/**
 * 工具栏布局契约：栏高 32px，标题 / 语言 / 复制图标的视觉中心
 * 落在同一条水平中线。断言必须能拒绝「baseline + align-self:center」
 * 这种混用模型，而不是只对当前源码做通过性字符串匹配。
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

const TOOLBAR_START = css.indexOf('.frame.has-toolbar');
const toolbarCss = TOOLBAR_START >= 0 ? css.slice(TOOLBAR_START) : css;

/** 取出选择器命中工具栏区块内的第一个规则体（忽略注释）。 */
function ruleBody(source, selectorRe) {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = new RegExp(selectorRe.source + '\\s*\\{([^}]+)\\}', selectorRe.flags);
  const m = stripped.match(re);
  return m ? m[1] : '';
}

function decls(body) {
  const map = new Map();
  for (const part of body.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const prop = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (prop) map.set(prop, value);
  }
  return map;
}

/**
 * 单一布局模型：header 用 align-items:center 一次对齐所有子项；
 * 禁止再对文字用 baseline、对按钮用另一种 align-self。
 * 对「已修复源」和「已知错误夹具」共用，避免测试只认当前文件字面量。
 */
function assertToolbarAlignmentModel(source, label = 'css') {
  const header = decls(ruleBody(source, /\.has-toolbar\s+\.header(?=\s*\{)/) || ruleBody(source, /\.header(?=\s*\{)/));
  const title = decls(
    ruleBody(source, /\.has-toolbar[\s\S]{0,80}?\.title(?=\s*\{)/) || ruleBody(source, /(?<![-\w])\.title(?=\s*\{)/),
  );
  const lang = decls(
    ruleBody(source, /\.has-toolbar[\s\S]{0,80}?\.lang(?=\s*\{)/) || ruleBody(source, /(?<![-\w])\.lang(?=\s*\{)/),
  );
  const copy = decls(
    ruleBody(source, /\.has-toolbar\s+\.copy(?=\s*\{)/) || ruleBody(source, /(?<![-\w])\.copy(?=\s*\{)/),
  );
  const button = decls(
    ruleBody(source, /\.has-toolbar\s+\.copy\s+button(?=\s*\{)/) || ruleBody(source, /\.copy\s+button(?=\s*\{)/),
  );

  assert.equal(header.get('display'), 'flex', `${label}: header 应为 flex 单行`);
  assert.equal(
    header.get('align-items'),
    'center',
    `${label}: header 必须以 align-items:center 把子项视觉中心对齐到同一水平中线，不能用 baseline`,
  );
  assert.ok(
    /^(flex-start|start)$/.test(header.get('justify-content') ?? ''),
    `${label}: header 需显式 justify-content:flex-start，以免被终端框默认的 center 带到中间`,
  );

  for (const [name, map] of [
    ['.title', title],
    ['.lang', lang],
    ['.copy', copy],
  ]) {
    const self = map.get('align-self');
    if (self && !/^(center|auto)$/.test(self)) {
      assert.fail(`${label}: ${name} 的 align-self:${self} 会破坏统一中线`);
    }
  }
  // 混用模型：父级 baseline + 按钮 align-self:center（当前生产错误）
  if (
    header.get('align-items') === 'baseline' &&
    (copy.get('align-self') === 'center' || button.get('align-self') === 'center')
  ) {
    assert.fail(`${label}: 不能把文字 baseline 与按钮 center 混在同一行`);
  }
  assert.notEqual(header.get('align-items'), 'baseline', `${label}: 禁止 align-items:baseline`);

  const titleLh = title.get('line-height');
  const langLh = lang.get('line-height');
  assert.equal(titleLh, '1', `${label}: title line-height 应为 1，避免继承 EC uiLineHeight 1.65`);
  assert.equal(langLh, '1', `${label}: lang line-height 应为 1`);

  const titleMargin = title.get('margin') ?? title.get('margin-block') ?? title.get('margin-block-start') ?? '';
  const langMarginBlock = lang.get('margin') ?? lang.get('margin-block') ?? lang.get('margin-top') ?? '';
  assert.match(titleMargin, /^0(\s+0){0,3}$/, `${label}: title 需清掉 EC/UA 垂直 margin，现为 ${titleMargin}`);
  assert.match(
    String(lang.get('margin') ?? lang.get('margin-block') ?? '0'),
    /0/,
    `${label}: lang 垂直 margin 应为 0（可用 margin-left:auto 推到右侧）`,
  );
  void langMarginBlock;

  const headerMargin = header.get('margin');
  assert.equal(headerMargin, '0', `${label}: figcaption.header 需 margin:0，避免 UA 图注外边距撑开`);

  const buttonSelf = button.get('align-self');
  if (buttonSelf) {
    assert.match(
      buttonSelf,
      /^(center|auto)$/,
      `${label}: 需覆盖 EC 默认 button align-self:flex-end，现为 ${buttonSelf}`,
    );
  }
  const display = button.get('display');
  const placed =
    (display === 'grid' && /center/.test(button.get('place-items') ?? '')) ||
    (display === 'flex' && /center/.test(button.get('align-items') ?? ''));
  assert.ok(placed, `${label}: button 应为 grid/flex 并在自身热区内居中图标`);
  assert.match(button.get('line-height') ?? '', /^(0|1)$/, `${label}: button 需切断继承来的 line-height:1.65`);
}

test('对齐断言能抓住旧的 baseline + align-self:center 混用模型', () => {
  const broken = `
    .has-toolbar .header {
      display: flex;
      align-items: baseline;
      justify-content: flex-start;
      margin: 0;
    }
    .has-toolbar .title { margin: 0; line-height: 1; }
    .has-toolbar .lang { margin: 0 0 0 auto; line-height: 1; }
    .has-toolbar .copy { align-self: center; }
    .has-toolbar .copy button { display: grid; place-items: center; line-height: 0; }
  `;
  assert.throws(() => assertToolbarAlignmentModel(broken, 'broken-fixture'), /baseline|中线|混/);
});

test('当前样式使用单一的水平中线居中模型', () => {
  assertToolbarAlignmentModel(toolbarCss, 'markdown.css');
  assert.doesNotMatch(toolbarCss, /\.has-toolbar\s+\.header[^}]*align-items:\s*baseline/);
});

test('令牌：栏高与点击区均为 32px，图标 13px，不再另设把栏高撑高的 toolbar-inset', () => {
  assert.match(tokens, /--code-toolbar-h:\s*32px/);
  assert.match(tokens, /--code-copy-size:\s*32px/);
  assert.match(tokens, /--code-copy-icon:\s*13px/);
  assert.doesNotMatch(tokens, /--code-toolbar-inset/);
});

test('工具栏为单行 flex，标题截断，语言在右侧', () => {
  assert.match(css, /\.has-toolbar\s+\.header[\s\S]{0,400}display:\s*flex/);
  assert.match(css, /\.has-toolbar[\s\S]{0,800}\.title[\s\S]{0,400}text-overflow:\s*ellipsis/);
  assert.match(css, /\.has-toolbar[\s\S]{0,1200}\.lang[\s\S]{0,400}text-transform:\s*uppercase/);
  assert.match(css, /\.has-toolbar[\s\S]{0,1200}\.lang[\s\S]{0,400}margin-left:\s*auto|margin:\s*0\s+0\s+0\s+auto/);
  assert.match(css, /\.has-toolbar[\s\S]{0,800}\.title[\s\S]{0,400}line-height:\s*1/);
  assert.match(css, /\.has-toolbar[\s\S]{0,1200}\.lang[\s\S]{0,400}line-height:\s*1/);
  assert.match(css, /color:\s*var\(--ink-muted\)/);
});

test('复制按钮保留 32px 点击区，图标用更小的视觉尺寸，成功反馈不占文档流', () => {
  const copy = ruleBody(toolbarCss, /\.has-toolbar\s+\.copy(?=\s*\{)/);
  const button = ruleBody(toolbarCss, /\.has-toolbar\s+\.copy\s+button(?=\s*\{)/);
  const after = ruleBody(toolbarCss, /\.has-toolbar[\s\S]{0,80}?\.copy\s+button::after(?=\s*\{)/);
  const feedback = ruleBody(toolbarCss, /\.has-toolbar[\s\S]{0,80}?\.copy\s+\.feedback(?=\s*\{)/);
  assert.match(copy, /position:\s*relative/);
  assert.match(button, /min-width:\s*var\(--code-copy-size\)/);
  assert.match(button, /min-height:\s*var\(--code-copy-size\)/);
  assert.match(button, /border-radius:\s*var\(--r-round\)/);
  assert.match(after, /--code-copy-icon/);
  assert.match(after, /position:\s*absolute/);
  assert.match(feedback, /position:\s*absolute/);
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

test('工具栏栏高等于 32px 点击区，左侧与代码对齐，顶/右不再额外加 pad', () => {
  const header = ruleBody(toolbarCss, /\.has-toolbar\s+\.header(?=\s*\{)/);
  assert.match(header, /min-height:\s*var\(--code-toolbar-h\)/);
  assert.match(header, /height:\s*var\(--code-toolbar-h\)/);
  assert.match(header, /padding:\s*0\s+0\s+0\s+var\(--code-pad-x\)/);
  assert.doesNotMatch(css, /min-height:\s*calc\(var\(--code-copy-size\)\s*\+\s*var\(--code-toolbar-inset\)\)/);
  const untitledHeader = css.match(/\.has-toolbar:not\(\.has-title\)\s+\.header\s*\{[^}]+\}/);
  assert.ok(untitledHeader, 'missing untitled header rule');
  assert.doesNotMatch(untitledHeader[0], /padding:\s*var\(--code-toolbar-inset\)/);
  assert.doesNotMatch(untitledHeader[0], /min-height:\s*calc/);
});

test('明确覆盖 EC 默认按钮外壳：去掉原生外观、边框、阴影与内部装饰层', () => {
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,500}appearance:\s*none/);
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,500}box-shadow:\s*none/);
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,500}border:\s*0/);
  assert.match(css, /\.has-toolbar\s+\.copy\s+button[\s\S]{0,500}background:\s*transparent/);
  assert.match(css, /button::before[\s\S]{0,200}(?:box-shadow:\s*none|border:\s*0|background:\s*none|opacity:\s*0)/);
  assert.match(css, /\.copy\s+button\s+div[\s\S]{0,200}(?:box-shadow:\s*none|background:\s*none|opacity:\s*0)/);
  assert.match(css, /button:hover[\s\S]{0,200}background:\s*transparent/);
  assert.match(css, /button:active[\s\S]{0,200}background:\s*transparent/);
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

test('DESIGN.md §7 为单行工具栏，标题/语言/图标同一水平中线，无标题栏在文档流中不叠字', () => {
  assert.match(design, /单行工具栏|语言.*复制/);
  assert.match(design, /复制图标/);
  assert.match(design, /文档流/);
  assert.match(design, /栏高就是点击区|不再把 32px 热区|约 9\.5px/);
  assert.match(design, /水平中线|视觉中心/);
  const codeBlock = (design.match(/- \*\*代码块\*\*[^\n]+/) || [''])[0];
  assert.ok(codeBlock, 'DESIGN §7 应有代码块条目');
  assert.doesNotMatch(codeBlock, /基线对齐/);

  assert.match(design, /hover|悬停/);
  assert.doesNotMatch(design, /栏高为点击区加该 inset/);
  assert.doesNotMatch(design, /右侧沟槽/);
  assert.doesNotMatch(design, /文件名为右上角 mono `--fs-xs` 弱色小标签；复制按钮为 hover 才出现的幽灵图标/);
});
