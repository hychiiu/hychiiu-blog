/** 界面文案字典 + 语言工具。内容类文案（介绍、引言、关于）在 src/site.config.ts。 */
import { site, type Lang } from './site.config';

export const langs: Lang[] = ['zh', 'en'];
export const htmlLang: Record<Lang, string> = { zh: 'zh-CN', en: 'en' };

export const ui = {
  zh: {
    'nav.home': '首页',
    'nav.posts': '文章',
    'nav.notes': '手记',
    'nav.about': '关于',
    'toggle.theme': '切换深浅色',
    'toggle.lang': '切换语言',
    'home.since': 'since',
    'stats.posts': 'Posts',
    'stats.notes': 'Notes',
    'stats.words': 'Words',
    'stats.days': 'Days',
    'sec.writing': 'Writing',
    'sec.writingTitle': '最近在写',
    'sec.quote': 'Quote',
    'sec.elsewhere': 'Elsewhere',
    'sec.elsewhereTitle': '在别处',
    'home.empty': '还没有文章',
    'btn.allPosts': '全部文章',
    'kind.post': '文章',
    'kind.note': '手记',
    'marker.zh': '中文',
    'marker.en': 'English',
    'posts.title': 'Posts',
    'posts.cn': '文章',
    'posts.eyebrow': (n: number) => `Posts · ${n} 篇`,
    'posts.lede': '按年份排列。',
    'posts.empty': '还没有文章',
    'posts.entries': (n: number) => `${n} ${n > 1 ? 'entries' : 'entry'}`,
    'notes.title': 'Notes',
    'notes.cn': '手记',
    'notes.eyebrow': (n: number) => `Notes · ${n} 篇`,
    'notes.lede': '不成文的碎片，记下当下的心情。',
    'notes.empty': '还没有手记',
    'notes.mood': '心情',
    'notes.weather': '天气',
    'about.title': 'About',
    'about.cn': '关于',
    'about.now': '现在',
    'about.colophon': '关于本站',
    'about.since': 'Since',
    'post.words': (n: number) => `${n} 字`,
    'post.min': (n: number) => `~ ${n} min`,
    'post.prev': '← 上一篇',
    'post.next': '下一篇 →',
    'post.back': '返回',
    'post.comments': '评论',
    'post.fallback': '本文暂无英文版本。',
    'nf.eyebrow': 'Error · 404 · Not found',
    'nf.cn': '迷途',
    'nf.lede': '你要找的页面不存在，或者已经被移走了。这里只剩留白。',
    'nf.home': '← 回到首页',
    'footer.built': 'built with astro',
    'avatar.alt': (n: string) => `${n} 的头像`,
  },
  en: {
    'nav.home': 'Home',
    'nav.posts': 'Posts',
    'nav.notes': 'Notes',
    'nav.about': 'About',
    'toggle.theme': 'Toggle theme',
    'toggle.lang': 'Switch language',
    'home.since': 'since',
    'stats.posts': 'Posts',
    'stats.notes': 'Notes',
    'stats.words': 'Words',
    'stats.days': 'Days',
    'sec.writing': 'Writing',
    'sec.writingTitle': 'Recent Writing',
    'sec.quote': 'Quote',
    'sec.elsewhere': 'Elsewhere',
    'sec.elsewhereTitle': 'Elsewhere',
    'home.empty': 'No posts yet',
    'btn.allPosts': 'All posts',
    'kind.post': 'Post',
    'kind.note': 'Note',
    'marker.zh': 'Chinese',
    'marker.en': 'English',
    'posts.title': 'Posts',
    'posts.cn': '文章',
    'posts.eyebrow': (n: number) => `Posts · ${n}`,
    'posts.lede': 'Sorted by year.',
    'posts.empty': 'No posts yet',
    'posts.entries': (n: number) => `${n} ${n > 1 ? 'entries' : 'entry'}`,
    'notes.title': 'Notes',
    'notes.cn': '手记',
    'notes.eyebrow': (n: number) => `Notes · ${n}`,
    'notes.lede': 'Unpolished fragments — moments written down as they were.',
    'notes.empty': 'No notes yet',
    'notes.mood': 'mood',
    'notes.weather': 'weather',
    'about.title': 'About',
    'about.cn': '关于',
    'about.now': 'Now',
    'about.colophon': 'Colophon',
    'about.since': 'Since',
    'post.words': (n: number) => `${n} words`,
    'post.min': (n: number) => `~ ${n} min`,
    'post.prev': '← Previous',
    'post.next': 'Next →',
    'post.back': 'Back',
    'post.comments': 'Comments',
    'post.fallback': 'This piece is only available in Chinese.',
    'nf.eyebrow': 'Error · 404 · Not found',
    'nf.cn': '迷途',
    'nf.lede': 'The page you are looking for does not exist, or has moved. Only whitespace remains.',
    'nf.home': '← Back home',
    'footer.built': 'built with astro',
    'avatar.alt': (n: string) => `Avatar of ${n}`,
  },
} as const;

type Dict = (typeof ui)['zh'];
export function useT(lang: Lang) {
  return <K extends keyof Dict>(key: K): Dict[K] => (ui[lang] as unknown as Dict)[key] ?? ui.zh[key];
}

export function toLang(locale: string | undefined): Lang {
  return locale === 'en' ? 'en' : 'zh';
}

/** 给路径加上语言前缀：('en','/posts/') -> '/en/posts/' */
export function localizePath(lang: Lang, path: string): string {
  const clean = stripLang(path);
  if (lang === site.defaultLang) return clean;
  return `/${lang}${clean === '/' ? '/' : clean}`;
}

/** 去掉语言前缀：'/en/posts/' -> '/posts/' */
export function stripLang(path: string): string {
  const p = path.replace(/^\/en(?=\/|$)/, '');
  return p === '' ? '/' : p;
}

export function navItems(lang: Lang) {
  const t = useT(lang);
  return [
    { label: t('nav.home'), href: localizePath(lang, '/') },
    { label: t('nav.posts'), href: localizePath(lang, '/posts/') },
    { label: t('nav.notes'), href: localizePath(lang, '/notes/') },
    { label: t('nav.about'), href: localizePath(lang, '/about/') },
  ];
}

export function quoteMarks(lang: Lang, s: string) {
  return lang === 'zh' ? `「${s}」` : `“${s}”`;
}
