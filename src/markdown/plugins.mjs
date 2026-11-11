/**
 * 自定义 Markdown 插件（构建时执行，无后端）
 * - remarkMermaid：把 ```mermaid 代码块转成 <pre class="mermaid">，交给页面上的 mermaid 渲染
 * - rehypeFigure：段落里只有一张带 title 的图片时，转成 <figure> + <figcaption>
 * - rehypeTableWrap：表格外包一层可横向滚动的容器（窄屏不撑破版面）
 */
import { visit, SKIP } from 'unist-util-visit';

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index == null) return;
      parent.children[index] = {
        type: 'html',
        value: `<div class="mermaid-wrap"><pre class="mermaid" data-mermaid>${escape(node.value)}</pre></div>`,
      };
      return SKIP;
    });
  };
}

export function rehypeFigure() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || !parent || index == null) return;
      const kids = node.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
      if (kids.length !== 1) return;
      let img = kids[0];
      let wrapper = null;
      if (img.type === 'element' && img.tagName === 'a' && img.children.length === 1) {
        wrapper = img;
        img = img.children[0];
      }
      if (img.type !== 'element' || img.tagName !== 'img') return;
      const caption = img.properties?.title;
      if (!caption) return;
      delete img.properties.title;
      parent.children[index] = {
        type: 'element',
        tagName: 'figure',
        properties: {},
        children: [
          wrapper ?? img,
          {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [{ type: 'text', value: String(caption) }],
          },
        ],
      };
      return SKIP;
    });
  };
}

/** 正文图片统一懒加载、异步解码，并且不发送 Referer（GitHub 附件图片 / 外链图床需要） */
export function rehypeImageDefaults() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;
      node.properties = { loading: 'lazy', decoding: 'async', referrerPolicy: 'no-referrer', ...node.properties };
    });
  };
}

export function rehypeTableWrap() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index == null) return;
      if (parent.type === 'element' && parent.properties?.className?.includes?.('table-wrap')) return;
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'] },
        children: [node],
      };
      return SKIP;
    });
  };
}
