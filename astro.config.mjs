// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import expressiveCode from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';
import { remarkMermaid, rehypeFigure, rehypeTableWrap } from './src/markdown/plugins.mjs';
import { site } from './src/site.config.ts';

const mono = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";

export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'ignore',
  i18n: {
    locales: ['zh', 'en'],
    defaultLocale: 'zh',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    // 代码块：文件名标题、行高亮、diff、行号、折叠、复制按钮（全部构建时生成）
    expressiveCode({
      themes: ['github-light', 'github-dark-dimmed'],
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
      useDarkModeMediaQuery: false,
      plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
      defaultProps: { showLineNumbers: false, wrap: true },
      styleOverrides: {
        borderRadius: '6px',
        borderColor: 'var(--border)',
        codeFontFamily: mono,
        uiFontFamily: mono,
        codeFontSize: '13px',
        codeLineHeight: '1.7',
        codeBackground: 'var(--n-1)',
        focusBorder: 'var(--accent)',
        frames: {
          editorActiveTabBackground: 'var(--n-1)',
          editorActiveTabIndicatorTopColor: 'var(--accent)',
          editorActiveTabIndicatorBottomColor: 'transparent',
          editorTabBarBackground: 'color-mix(in srgb, var(--n-10) 3%, var(--paper))',
          editorTabBarBorderBottomColor: 'var(--border)',
          terminalTitlebarBackground: 'color-mix(in srgb, var(--n-10) 3%, var(--paper))',
          terminalTitlebarBorderBottomColor: 'var(--border)',
          terminalBackground: 'var(--n-1)',
          frameBoxShadowCssValue: 'none',
          tooltipSuccessBackground: 'var(--accent)',
        },
        textMarkers: {
          markBackground: 'color-mix(in srgb, var(--n-10) 6%, transparent)',
          markBorderColor: 'var(--accent)',
          insBackground: 'color-mix(in srgb, #5f8a63 16%, transparent)',
          insBorderColor: '#5f8a63',
          insDiffIndicatorColor: '#5f8a63',
          delBackground: 'color-mix(in srgb, #c56473 14%, transparent)',
          delBorderColor: '#c56473',
          delDiffIndicatorColor: '#c56473',
        },
      },
    }),
    mdx(),
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
      i18n: { defaultLocale: 'zh', locales: { zh: 'zh-CN', en: 'en' } },
    }),
  ],
  markdown: {
    processor: unified({
      gfm: true,
      smartypants: false,
      remarkPlugins: [remarkMath, [remarkEmoji, { accessible: true }], remarkAlert, remarkMermaid],
      rehypePlugins: [
        [rehypeKatex, { strict: false }],
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'append',
            properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
            content: { type: 'text', value: '#' },
          },
        ],
        [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
        rehypeFigure,
        rehypeTableWrap,
      ],
      remarkRehype: { footnoteLabel: 'Footnotes', footnoteBackLabel: 'Back to content' },
    }),
  },
});
