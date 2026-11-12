import { env } from './env.ts';
import { taxonomy } from './content.ts';

/**
 * 部署（Cloudflare Pages）相关：scripts/postbuild.mjs 据此生成 dist/_routes.json 与构建号，
 * functions/_middleware.js 读取同一份常量。
 */
export const pages = {
  /** Pages 项目名（npm run deploy 手动上传时使用；平时由 Git 推送自动构建） */
  project: env('PAGES_PROJECT', 'hychiiu-blog'),
  /** 交给 Pages Function 处理的路径（其余直接走静态资源）：随内容增删的页面，包括标签页 */
  functionRoutes: ['/posts/*', '/notes/*', `${taxonomy.base}*`, '/en/posts/*', '/en/notes/*', `/en${taxonomy.base}*`],
  /** 内部资源请求的缓存键参数名（对外 URL 不出现） */
  cacheKeyParam: '__b',
  /** 构建号文件（构建时改写；本地为 'dev'） */
  buildIdFile: 'functions/_build.js',
  buildIdLength: 12,
};
