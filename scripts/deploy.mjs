/** 手动部署：wrangler pages deploy dist，项目名来自 src/config/deploy.ts（PAGES_PROJECT 可覆盖） */
import { spawnSync } from 'node:child_process';
import { pages } from '../src/config/deploy.ts';

const r = spawnSync('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', pages.project], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
