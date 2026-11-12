/**
 * 站点身份与首页 / 关于页内容 —— 改名字、介绍、引言、强调色都在这里。
 * 带 { zh, en } 的字段分别是中文 / 英文版本（英文站点在 /en/）。
 * 其它配置：语言 locales.ts、导航 nav.ts、社交 social.ts、内容来源 content.ts、评论 / 备案 integrations.ts、
 * 部署 deploy.ts；界面固定文案在 src/i18n/{zh,en}.ts。
 */
import { env } from './env.ts';
import { defaultLang } from './locales.ts';
import type { Localized } from './locales.ts';

export const site = {
  /** 正式域名（RSS / sitemap / canonical / hreflang / robots.txt）。环境变量 SITE_URL 可覆盖 */
  url: env('SITE_URL', 'https://inbluemoon.com'),

  name: 'hychiiu',
  /** 名字旁边的强调色中文。留空字符串则不显示 */
  nameCJK: '怀秋',
  /** 浏览器标签页标题 */
  title: 'hychiiu',

  /** 默认语言（根路径 /），定义见 locales.ts */
  defaultLang,

  /** SEO 描述 */
  description: {
    zh: 'hychiiu 的个人主页与随笔。',
    en: 'Personal site and occasional writing of hychiiu.',
  } satisfies Localized,

  /** 首页顶部 mono 小标签：● {eyebrow} · since {startDate} */
  eyebrow: { zh: 'Personal Site', en: 'Personal Site' } satisfies Localized,

  /** 首页大标题：{greeting} {name} */
  greeting: { zh: "Hi, I'm", en: "Hi, I'm" } satisfies Localized,
  wave: '👋', // 显示在一句话介绍末尾，留空则不显示

  /** 首页一句话介绍（留空则不显示） */
  intro: { zh: '', en: '' } satisfies Localized,
  /** 第二行补充介绍（留空则不显示） */
  subIntro: { zh: '', en: '' } satisfies Localized,

  /** 首页引言（中文自动加「」，英文自动加 “ ”）。留空则整个 Quote 区块不显示 */
  quote: { zh: '', en: '' } satisfies Localized,
  quoteAuthor: { zh: '', en: '' } satisfies Localized, // 可选，例如 '— 某本书'

  /** 首页「最近在写」区块说明（留空则不显示） */
  recentLede: { zh: '', en: '' } satisfies Localized,

  /**
   * 关于页正文。paragraphs 支持少量 HTML（<a>、<em>、<strong>）。
   * paragraphs / now 为空数组时对应区块不显示。
   */
  about: {
    zh: {
      paragraphs: [] as string[],
      now: [] as string[],
      colophon:
        '本站使用 <a href="https://astro.build" target="_blank" rel="noopener">Astro</a> 构建，纯静态托管于 Cloudflare Pages，文章写在 GitHub Issues 里。',
    },
    en: {
      paragraphs: [] as string[],
      now: [] as string[],
      colophon:
        'Built with <a href="https://astro.build" target="_blank" rel="noopener">Astro</a>, served as static files on Cloudflare Pages, with posts written as GitHub Issues.',
    },
  } satisfies Localized<{ paragraphs: string[]; now: string[]; colophon: string }>,

  /** 头像：放在 public/ 下。替换方法见 README（npm run avatar -- 你的图片.png） */
  avatar: '/avatar.webp',
  avatarLarge: '/avatar@2x.webp',

  /** 站点开始日期，用于首页「已运行 N 天」统计 */
  startDate: '2026-11-11',

  /** 唯一强调色（松绿）。亮色 / 暗色分别设置：深色底上用更亮、更低饱和的一档，保证对比度 */
  accent: {
    light: '#3a7350',
    dark: '#7eb892',
  },

  /** 浏览器地址栏颜色（与 tokens.css 的 --paper 一致） */
  themeColor: { light: '#faf9f5', dark: '#18181a' },
};
