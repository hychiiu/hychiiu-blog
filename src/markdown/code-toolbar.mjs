/**
 * 方案 A：在 Expressive Code 的 frame 上补齐单行工具栏
 * （左标题、右语言 + 复制）。在 plugin-frames 之后运行。
 */
import { definePlugin } from '@expressive-code/core';
import { h, toText, addClassName, getClassNames } from '@expressive-code/core/hast';

const hasClass = (node, name) => node?.type === 'element' && getClassNames(node).includes(name);

const findChild = (parent, pred) => {
  if (!parent?.children) return { node: null, index: -1 };
  const index = parent.children.findIndex(pred);
  return { node: index >= 0 ? parent.children[index] : null, index };
};

const textOf = (node) => (node ? toText(node).trim() : '');

/**
 * 装饰已由 plugin-frames 包好的 block AST。
 * @param {import('@expressive-code/core/hast').Element} blockAst
 * @param {string} [language]
 */
export function applyCodeToolbar(blockAst, language = 'plaintext') {
  if (!blockAst || blockAst.type !== 'element') return blockAst;

  const frame = hasClass(blockAst, 'frame')
    ? blockAst
    : ((blockAst.children ?? []).find((n) => hasClass(n, 'frame')) ?? blockAst);
  if (!hasClass(frame, 'frame')) return blockAst;

  addClassName(frame, 'has-toolbar');

  let { node: header } = findChild(frame, (n) => hasClass(n, 'header') || n.tagName === 'figcaption');
  if (!header) {
    header = h('figcaption', { className: ['header'] }, []);
    frame.children = [header, ...(frame.children ?? [])];
  }

  const { node: title } = findChild(header, (n) => hasClass(n, 'title'));
  const titleText = textOf(title);
  if (title && titleText) {
    title.properties ??= {};
    title.properties.title = titleText;
  }

  const lang = String(language || 'plaintext').trim() || 'plaintext';
  const label = lang.toUpperCase();
  const { node: existingLang } = findChild(header, (n) => hasClass(n, 'lang'));
  if (existingLang) {
    existingLang.children = [{ type: 'text', value: label }];
  } else {
    header.children.push(h('span', { className: ['lang'] }, label));
  }

  const { node: copy, index: copyIndex } = findChild(frame, (n) => hasClass(n, 'copy'));
  if (copy && copyIndex >= 0) {
    frame.children.splice(copyIndex, 1);
    if (!findChild(header, (n) => hasClass(n, 'copy')).node) header.children.push(copy);
    const button = (copy.children ?? []).find((n) => n.tagName === 'button');
    if (button) {
      button.properties ??= {};
      if (!button.properties['aria-label']) {
        button.properties['aria-label'] = String(button.properties.title || 'Copy to clipboard');
      }
    }
  }

  return blockAst;
}

export function pluginCodeToolbar() {
  return definePlugin({
    name: 'Code Toolbar',
    hooks: {
      postprocessRenderedBlock: ({ codeBlock, renderData }) => {
        applyCodeToolbar(renderData.blockAst, codeBlock.language);
      },
    },
  });
}
