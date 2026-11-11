import { copyFileSync, existsSync, writeFileSync } from 'node:fs';

// Cloudflare Pages 会为 /en/* 下不存在的路径寻找最近的 en/404.html
if (existsSync('dist/en/404/index.html')) copyFileSync('dist/en/404/index.html', 'dist/en/404.html');

// 只在 Pages 构建环境里写入构建号（functions/_middleware.js 用它让缓存键随部署变化）
if (process.env.CF_PAGES) {
  const id = (process.env.CF_PAGES_COMMIT_SHA || String(Date.now())).slice(0, 12);
  writeFileSync('functions/_build.js', `export const BUILD_ID = '${id}';\n`);
}
