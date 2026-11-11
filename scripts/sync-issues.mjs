#!/usr/bin/env node
/**
 * 把 GitHub Issues 同步成 src/data/issues.json（构建时由 Astro 读取）
 *
 * 规则：
 * - 只收录仓库所有者本人发的 issue（不含 PR），且带 `post` 或 `note` 标签
 * - 带 `draft` 标签的不收录（= 取消发布）；删除 issue 也等于取消发布
 * - open = 正常发布；closed = 归档（仍可访问，出现在归档页）
 * - 每个 issue 的全部评论一并保存（静态展示）
 *
 * 用法：GITHUB_TOKEN=xxx node scripts/sync-issues.mjs [owner/repo]
 * （GitHub Action 里使用内置 GITHUB_TOKEN；本地不带 token 也能跑，只是有频率限制）
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const repo = process.argv[2] || process.env.GITHUB_REPOSITORY || 'hychiiu/hychiiu-blog';
const [owner] = repo.split('/');
const author = (process.env.BLOG_AUTHOR || owner).toLowerCase();
const out = 'src/data/issues.json';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'hychiiu-blog-sync',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function all(path) {
  const items = [];
  let url = `https://api.github.com${path}${path.includes('?') ? '&' : '?'}per_page=100`;
  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} ← ${url}\n${await res.text()}`);
    items.push(...(await res.json()));
    const next = (res.headers.get('link') || '').match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return items;
}

const SYSTEM_LABELS = new Set(['post', 'note', 'draft', 'en']);
const reactions = (r) => {
  if (!r) return undefined;
  const keys = ['+1', '-1', 'laugh', 'hooray', 'confused', 'heart', 'rocket', 'eyes'];
  const o = Object.fromEntries(keys.filter((k) => r[k] > 0).map((k) => [k, r[k]]));
  return Object.keys(o).length ? o : undefined;
};

const issues = (await all(`/repos/${repo}/issues?state=all&creator=${author}&sort=created&direction=desc`))
  .filter((i) => !i.pull_request && i.user?.login?.toLowerCase() === author)
  .map((i) => ({ ...i, labelNames: i.labels.map((l) => (typeof l === 'string' ? l : l.name)) }))
  .filter((i) => (i.labelNames.includes('post') || i.labelNames.includes('note')) && !i.labelNames.includes('draft'));

const result = [];
for (const i of issues) {
  const comments = i.comments > 0 ? await all(`/repos/${repo}/issues/${i.number}/comments`) : [];
  result.push({
    number: i.number,
    kind: i.labelNames.includes('note') && !i.labelNames.includes('post') ? 'note' : 'post',
    title: i.title,
    body: (i.body || '').replace(/\r\n/g, '\n'),
    state: i.state,
    locked: i.locked,
    lang: i.labelNames.includes('en') ? 'en' : 'zh',
    tags: i.labelNames.filter((n) => !SYSTEM_LABELS.has(n)),
    url: i.html_url,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    closedAt: i.closed_at,
    reactions: reactions(i.reactions),
    comments: comments.map((c) => ({
      id: c.id,
      author: c.user?.login,
      avatar: c.user?.avatar_url,
      authorUrl: c.user?.html_url,
      association: c.author_association,
      body: (c.body || '').replace(/\r\n/g, '\n'),
      url: c.html_url,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      reactions: reactions(c.reactions),
    })),
  });
}
result.sort((a, b) => a.number - b.number);

const json = JSON.stringify({ repo, issues: result }, null, 2) + '\n';
const prev = existsSync(out) ? readFileSync(out, 'utf8') : '';
if (prev === json) {
  console.log(`issues.json 无变化（${result.length} 条）`);
} else {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, json);
  console.log(
    `issues.json 已更新：${result.length} 条（${result.filter((r) => r.state === 'open').length} 发布 / ${result.filter((r) => r.state === 'closed').length} 归档）`,
  );
}
