// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
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
import { remarkMermaid, rehypeFigure, rehypeImageDefaults, rehypeTableWrap } from './src/markdown/plugins.mjs';
import { site } from './src/site.config.ts';

const mono = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";

export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'ignore',
  // 鼠标悬停 / 手指按下时预取站内链接，配合 ClientRouter 做到秒开
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  i18n: {
    locales: ['zh', 'en'],
    defaultLocale: 'zh',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    // 代码块（docs/DESIGN.md §7 代码块）：极简——无窗口外框/阴影/标签栏，极淡底色，
    // 文件名为弱色小标签，复制按钮 hover 才出现；终端框仅在显式写 frame="terminal" 时出现。
    expressiveCode({
      themes: ['github-light', 'github-dark-dimmed'],
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
      useDarkModeMediaQuery: false,
      plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
      defaultProps: { showLineNumbers: false, wrap: true, frame: 'code' },
      styleOverrides: {
        borderRadius: 'var(--r-md)',
        borderWidth: '0px',
        borderColor: 'transparent',
        codeFontFamily: mono,
        uiFontFamily: mono,
        codeFontSize: 'var(--fs-meta)',
        codeLineHeight: 'var(--lh-code)',
        codePaddingBlock: '16px',
        codePaddingInline: '20px',
        codeBackground: 'var(--surface-1)',
        focusBorder: 'var(--accent)',
        scrollbarThumbColor: 'color-mix(in srgb, var(--n-10) 14%, transparent)',
        scrollbarThumbHoverColor: 'color-mix(in srgb, var(--n-10) 24%, transparent)',
        uiFontSize: 'var(--fs-xs)',
        gutterBorderWidth: '0px',
        gutterForeground: 'color-mix(in srgb, var(--n-10) 28%, transparent)',
        frames: {
          frameBoxShadowCssValue: 'none',
          editorBackground: 'var(--surface-1)',
          editorTabBarBackground: 'var(--surface-1)',
          editorTabBarBorderColor: 'transparent',
          editorTabBarBorderBottomColor: 'transparent',
          editorActiveTabBackground: 'transparent',
          editorActiveTabForeground: 'var(--ink-faint)',
          editorActiveTabBorderColor: 'transparent',
          editorActiveTabIndicatorTopColor: 'transparent',
          editorActiveTabIndicatorBottomColor: 'transparent',
          editorActiveTabIndicatorHeight: '0px',
          terminalBackground: 'var(--surface-1)',
          terminalTitlebarBackground: 'var(--surface-1)',
          terminalTitlebarBorderBottomColor: 'transparent',
          terminalTitlebarForeground: 'var(--ink-faint)',
          terminalTitlebarDotsOpacity: '0.35',
          inlineButtonBackground: 'var(--n-10)',
          inlineButtonBackgroundIdleOpacity: '0',
          inlineButtonBackgroundHoverOrFocusOpacity: '0.06',
          inlineButtonBackgroundActiveOpacity: '0.1',
          inlineButtonForeground: 'var(--ink-muted)',
          inlineButtonBorder: 'transparent',
          inlineButtonBorderOpacity: '0',
          tooltipSuccessBackground: 'var(--accent)',
          tooltipSuccessForeground: '#fff',
        },
        textMarkers: {
          lineMarkerAccentWidth: '2px',
          lineMarkerAccentMargin: '0px',
          markBackground: 'var(--accent-8)',
          markBorderColor: 'var(--accent-30)',
          insBackground: 'color-mix(in srgb, #5f8a63 10%, transparent)',
          insBorderColor: 'color-mix(in srgb, #5f8a63 45%, transparent)',
          insDiffIndicatorColor: '#5f8a63',
          delBackground: 'color-mix(in srgb, #c56473 9%, transparent)',
          delBorderColor: 'color-mix(in srgb, #c56473 40%, transparent)',
          delDiffIndicatorColor: '#c56473',
        },
      },
    }),
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
        rehypeImageDefaults,
        rehypeTableWrap,
      ],
      remarkRehype: { footnoteLabel: 'Footnotes', footnoteBackLabel: 'Back to content' },
    }),
  },
});
