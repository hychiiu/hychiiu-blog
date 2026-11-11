/**
 * 构建后处理（Cloudflare Pages 专用的产物），配置来自 src/config/deploy.ts 与 locales.ts。
 * Node ≥ 22.18 可直接 import .ts（类型擦除）。
 */
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { pages } from '../src/config/deploy.ts';
import { langs, defaultLang } from '../src/config/locales.ts';

// Pages 会为 /{lang}/* 下不存在的路径寻找最近的 {lang}/404.html
for (const l of langs.filter((l) => l !== defaultLang)) {
  if (existsSync(`dist/${l}/404/index.html`)) copyFileSync(`dist/${l}/404/index.html`, `dist/${l}/404.html`);
}

// 只把文章 / 手记路径交给 Pages Function
writeFileSync('dist/_routes.json', JSON.stringify({ version: 1, include: pages.functionRoutes, exclude: [] }) + '\n');

// 只在 Pages 构建环境里写入构建号（functions/_middleware.js 用它让缓存键随部署变化）
if (process.env.CF_PAGES) {
  const id = (process.env.CF_PAGES_COMMIT_SHA || String(Date.now())).slice(0, pages.buildIdLength);
  writeFileSync(pages.buildIdFile, `export const BUILD_ID = '${id}';\n`);
}
