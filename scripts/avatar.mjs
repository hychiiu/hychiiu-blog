// 用法：npm run avatar -- ./你的头像.png
// 生成 public/avatar.png（原图备份）、avatar.webp(256)、avatar@2x.webp(512)、favicon.png、apple-touch-icon.png
import sharp from 'sharp';
import { copyFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) {
  console.error('用法：npm run avatar -- ./你的头像.png');
  process.exit(1);
}
copyFileSync(src, 'public/avatar.png');
const img = () => sharp(src).resize({ width: 512, height: 512, fit: 'cover', position: 'attention' });
await Promise.all([
  img().resize(256, 256).webp({ quality: 86 }).toFile('public/avatar.webp'),
  img().webp({ quality: 82 }).toFile('public/avatar@2x.webp'),
  img().resize(64, 64).png().toFile('public/favicon.png'),
  img().resize(180, 180).png().toFile('public/apple-touch-icon.png'),
]);
console.log('✓ 头像已更新：public/avatar.webp, avatar@2x.webp, favicon.png, apple-touch-icon.png');
