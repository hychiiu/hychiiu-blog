/**
 * 内容来源：GitHub 仓库的 Issues（见 README「写文章」）。
 * Astro 构建、scripts/sync-issues.mjs 与 GitHub Action 共用这一份（Node 直接加载 .ts，所以这里只 import 带扩展名的相对路径）。
 */
import { env } from './env.ts';

/** owner/name。优先 GITHUB_REPO，其次 Actions 自带的 GITHUB_REPOSITORY */
const repo = env('GITHUB_REPO', env('GITHUB_REPOSITORY', 'hychiiu/hychiiu-blog'));

export const content = {
  repo,
  /** 只收录这个 GitHub 用户发的 issue（不区分大小写）；默认是仓库所有者 */
  author: env('BLOG_AUTHOR', repo.split('/')[0]).toLowerCase(),
  /** 有特殊含义的 label，其余 label 作为标签显示 */
  labels: { post: 'post', note: 'note', draft: 'draft', en: 'en' },
  /** 同步结果（提交到仓库，构建时读取）；路径相对仓库根目录 */
  dataFile: 'src/data/issues.json',
  /** 本地预览时指向一份测试数据（不提交），例如 YH_ISSUES_FILE=/tmp/issues.json */
  localDataFile: env('YH_ISSUES_FILE', ''),
  githubApi: env('GITHUB_API_URL', 'https://api.github.com'),
  githubApiVersion: '2022-11-28',
  /** 阅读时长：每分钟字数（中文按字、英文按词） */
  wordsPerMinute: 400,
};

/**
 * 分类 = 标签（单一维度，见 README「标签」）：issue 上除 post / note / draft / en 以外的 label，
 * 加上正文 front block 的 tags。第一个标签视作这篇的主分类（文章页 meta 里的强调色那一项）。
 */
export const taxonomy = {
  /** 标签页根路径（不带语言前缀）；单个标签为 {base}{slug}/ */
  base: '/tags/',
  /** 文章列表筛选行最多直接列出的标签数（按篇数排序），其余收进「全部标签」 */
  filterLimit: 8,
};

export const systemLabels = new Set(Object.values(content.labels));
