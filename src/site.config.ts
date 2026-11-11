/**
 * 站点唯一配置文件 —— 改名字、介绍、链接、引言、强调色、评论都在这里。
 * 带 { zh, en } 的字段分别是中文 / 英文版本（英文站点在 /en/）。
 * 界面上的固定文案（导航、按钮、页脚等）在 src/i18n.ts 的字典里。
 */

export type Lang = 'zh' | 'en';
export type Localized<T = string> = Record<Lang, T>;

export interface SocialLink {
  /** 图标名：github | x | mail | telegram | bilibili | rss | link */
  icon: 'github' | 'x' | 'mail' | 'telegram' | 'bilibili' | 'rss' | 'link';
  label: string;
  href: string;
}

export const site = {
  /** 部署后的正式域名（用于 RSS / sitemap / canonical / hreflang）。绑定域名后改成你的域名 */
  url: 'https://hychiiu-blog.pages.dev',

  name: 'hychiiu',
  /** 名字旁边的强调色中文（Yohaku 风格的「余白」位置）。留空字符串则不显示 */
  nameCJK: '怀秋',
  /** 浏览器标签页标题 */
  title: 'hychiiu',

  /** 默认语言（根路径 /）与可选语言 */
  defaultLang: 'zh' as Lang,

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

  /** 首页一句话介绍（TODO：之后改成你自己的） */
  intro: {
    zh: '一句话介绍占位，之后可改。',
    en: 'A one-line intro placeholder — edit me later.',
  } satisfies Localized,
  /** 第二行补充介绍，可留空字符串 */
  subIntro: {
    zh: '写代码，也写一点生活。偶尔更新，慢慢来。',
    en: 'I write code, and a little about life. Updated rarely, slowly.',
  } satisfies Localized,

  /** 首页引言（中文自动加「」，英文自动加 “ ”） */
  quote: {
    zh: '把日子过成诗，把代码写成散文。',
    en: 'Live the days like poetry; write the code like prose.',
  } satisfies Localized,
  quoteAuthor: { zh: '', en: '' } satisfies Localized, // 可选，例如 '— 某本书'

  /** 首页「最近在写」区块说明 */
  recentLede: {
    zh: '写得不多，但每一篇都认真。下面是最近留下的文字。',
    en: 'Not much, but every piece is written with care. Here is the latest.',
  } satisfies Localized,

  /**
   * 关于页正文。paragraphs 支持少量 HTML（<a>、<em>、<strong>）。
   * TODO：改成你自己的介绍。
   */
  about: {
    zh: {
      paragraphs: [
        '你好，我是 hychiiu。这里是关于页面的占位文字，之后可以改成你自己的故事。',
        '可以写写你在做什么、喜欢什么、相信什么；也可以只留一句话，让<em>留白</em>替你说完剩下的。',
      ],
      now: ['正在做的事情：占位', '最近在读 / 在听：占位', '常用工具：占位'],
      colophon:
        '本站使用 <a href="https://astro.build" target="_blank" rel="noopener">Astro</a> 构建，纯静态托管于 Cloudflare Pages；视觉语言参考了开源的 Yohaku 设计系统（MIT）。',
    },
    en: {
      paragraphs: [
        "Hi, I'm hychiiu. This is placeholder text for the about page — replace it with your own story.",
        'Write about what you are making, what you love, what you believe; or leave a single line and let the <em>whitespace</em> say the rest.',
      ],
      now: ['Working on: placeholder', 'Reading / listening: placeholder', 'Daily tools: placeholder'],
      colophon:
        'Built with <a href="https://astro.build" target="_blank" rel="noopener">Astro</a>, served as static files on Cloudflare Pages. The visual language follows the open-source Yohaku design system (MIT).',
    },
  } satisfies Localized<{ paragraphs: string[]; now: string[]; colophon: string }>,

  /** 头像：放在 public/ 下。替换方法见 README（npm run avatar -- 你的图片.png） */
  avatar: '/avatar.webp',
  avatarLarge: '/avatar@2x.webp',

  /** 站点开始日期，用于首页「已运行 N 天」统计 */
  startDate: '2026-11-11',

  /** 唯一强调色（Yohaku 梅色）。亮色 / 暗色分别设置 */
  accent: {
    light: '#c56473',
    dark: '#c56473', // 与 yohaku.innei.dev 暗色一致；想更亮可用 '#e095a4'
  },

  /** 社交链接：取消注释即可启用。RSS 会自动指向当前语言的 feed */
  socials: [
    { icon: 'github', label: 'GitHub', href: 'https://github.com/hychiiu' },
    // { icon: 'x', label: 'X', href: 'https://x.com/你的用户名' },
    // { icon: 'mail', label: 'Email', href: 'mailto:you@example.com' },
    // { icon: 'telegram', label: 'Telegram', href: 'https://t.me/你的用户名' },
    // { icon: 'bilibili', label: 'Bilibili', href: 'https://space.bilibili.com/你的UID' },
    { icon: 'rss', label: 'RSS', href: '/rss.xml' },
  ] satisfies SocialLink[] as SocialLink[],

  /**
   * Giscus 评论（基于 GitHub Discussions）。
   * TODO：到 https://giscus.app/zh-CN 生成配置后，把下面四个值填上，评论区就会自动出现。
   * 四个值任意一个为空时，评论区不渲染。
   */
  giscus: {
    repo: '', // 例如 'hychiiu/blog'
    repoId: '', // 例如 'R_kgDOxxxxxx'
    category: '', // 例如 'Announcements'
    categoryId: '', // 例如 'DIC_kwDOxxxxxx'
    mapping: 'pathname',
  },
};

export const giscusEnabled = Boolean(
  site.giscus.repo && site.giscus.repoId && site.giscus.category && site.giscus.categoryId,
);
