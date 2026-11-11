// Cloudflare Pages 会为 /en/* 下不存在的路径寻找最近的 en/404.html
import { copyFileSync, existsSync } from 'node:fs';
if (existsSync('dist/en/404/index.html')) copyFileSync('dist/en/404/index.html', 'dist/en/404.html');
