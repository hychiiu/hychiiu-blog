/**
 * 站点唯一配置文件 —— 改名字、介绍、链接、引言、强调色、评论都在这里。
 * Single source of truth for the whole site.
 */

export interface SocialLink {
  /** 图标名：github | x | mail | telegram | bilibili | rss | link */
  icon: 'github' | 'x' | 'mail' | 'telegram' | 'bilibili' | 'rss' | 'link';
  label: string;
  href: string;
}

export const site = {
  /** 部署后的正式域名（用于 RSS / sitemap / canonical）。绑定域名后改成你的域名 */
  url: 'https://hychiiu.pages.dev',

  name: 'hychiiu',
  /** 名字旁边的强调色中文（Yohaku 风格的「余白」位置）。留空字符串则不显示 */
  nameCJK: '怀秋',
  /** 首页顶部 mono 小标签：● {eyebrow} · since {startDate} */
  eyebrow: 'Personal Site',
  /** 浏览器标签页标题 */
  title: 'hychiiu',
  /** SEO 描述 */
  description: 'hychiiu 的个人主页与随笔。',
  lang: 'zh-CN',

  /** 首页大标题：Hi, I'm {name} */
  greeting: "Hi, I'm",
  wave: '👋', // 显示在一句话介绍末尾，留空则不显示

  /** 首页一句话介绍（TODO：之后改成你自己的） */
  intro: '一句话介绍占位，之后可改。',
  /** 第二行补充介绍，可留空字符串 */
  subIntro: '写代码，也写一点生活。偶尔更新，慢慢来。',

  /** 首页引言（会自动加上「」） */
  quote: '把日子过成诗，把代码写成散文。',
  /** 首页「最近在写」区块的小标题说明 */
  recentLede: '写得不多，但每一篇都认真。下面是最近留下的文字。',
  quoteAuthor: '', // 可选，例如 '— 某本书'

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

  /** 社交链接：取消注释即可启用 */
  socials: [
    { icon: 'github', label: 'GitHub', href: 'https://github.com/hychiiu' },
    // { icon: 'x', label: 'X', href: 'https://x.com/你的用户名' },
    // { icon: 'mail', label: 'Email', href: 'mailto:you@example.com' },
    // { icon: 'telegram', label: 'Telegram', href: 'https://t.me/你的用户名' },
    // { icon: 'bilibili', label: 'Bilibili', href: 'https://space.bilibili.com/你的UID' },
    { icon: 'rss', label: 'RSS', href: '/rss.xml' },
  ] satisfies SocialLink[] as SocialLink[],

  /** 顶部导航 */
  nav: [
    { label: '首页', href: '/' },
    { label: '文章', href: '/posts/' },
    { label: '手记', href: '/notes/' },
    { label: '关于', href: '/about/' },
  ],

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
    lang: 'zh-CN',
  },
};

export const giscusEnabled = Boolean(
  site.giscus.repo && site.giscus.repoId && site.giscus.category && site.giscus.categoryId,
);
