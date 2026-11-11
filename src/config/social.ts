/** 社交平台：首页名字下方的图标和关于页都用这份列表。取消注释并填上地址即可启用；RSS 会自动指向当前语言的 feed */
export interface SocialLink {
  /** 图标名：github | x | mail | telegram | bilibili | weibo | zhihu | steam | instagram | rss | link */
  icon: 'github' | 'x' | 'mail' | 'telegram' | 'bilibili' | 'weibo' | 'zhihu' | 'steam' | 'instagram' | 'rss' | 'link';
  label: string;
  href: string;
}

export const social: SocialLink[] = [
  { icon: 'github', label: 'GitHub', href: 'https://github.com/hychiiu' },
  { icon: 'mail', label: 'Email', href: 'mailto:i@hychiiu.com' },
  // { icon: 'x', label: 'X', href: 'https://x.com/你的用户名' },
  // { icon: 'telegram', label: 'Telegram', href: 'https://t.me/你的用户名' },
  // { icon: 'bilibili', label: 'Bilibili', href: 'https://space.bilibili.com/你的UID' },
  // { icon: 'weibo', label: '微博', href: 'https://weibo.com/你的UID' },
  // { icon: 'zhihu', label: '知乎', href: 'https://www.zhihu.com/people/你的ID' },
  // { icon: 'steam', label: 'Steam', href: 'https://steamcommunity.com/id/你的ID' },
  // { icon: 'instagram', label: 'Instagram', href: 'https://instagram.com/你的用户名' },
  { icon: 'rss', label: 'RSS', href: '/rss.xml' },
];
