/**
 * Astro 内容加载器：从 src/data/issues.json（由 scripts/sync-issues.mjs / GitHub Action 生成）读取文章与手记，
 * 用站点同一套 Markdown 管线（数学、Mermaid、提示块、Expressive Code……）在构建时渲染正文和评论。
 */
import type { Loader } from 'astro/loaders';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { IssuesFile } from '../types/issues';

/** 数据文件；本地预览可用 YH_ISSUES_FILE 指向一份测试数据（不提交到仓库） */
/** 正文里第一张图片（Markdown 或 <img>，忽略代码块），用作列表缩略图 / og:image */
export function firstImage(md: string): string | undefined {
  const text = md.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
  const m = /!\[[^\]]*\]\(\s*<?([^)\s>]+)|<img\b[^>]*?\bsrc=["']([^"']+)["']/i.exec(text);
  return m ? (m[1] ?? m[2]) : undefined;
}

const FILE = process.env.YH_ISSUES_FILE
  ? new URL(`file://${process.env.YH_ISSUES_FILE}`)
  : new URL('../data/issues.json', import.meta.url);

/**
 * 正文开头可选的元信息块，两种写法任选：
 *   <!-- slug: my-post
 *   description: 一句话摘要 -->
 * 或
 *   ---
 *   slug: my-post
 *   ---
 * 支持：slug / description / cover / date / mood / weather / tags（[a, b]）
 */
export function splitFront(body: string): { meta: Record<string, string | string[]>; content: string } {
  const src = body.replace(/^\uFEFF/, '');
  const m = src.match(/^\s*<!--([\s\S]*?)-->\s*\n?/) ?? src.match(/^\s*---\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { meta: {}, content: src };
  const meta: Record<string, string | string[]> = {};
  let ok = false;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/);
    if (!kv) continue;
    ok = true;
    let v: string | string[] = kv[2].replace(/^(['"])(.*)\1$/, '$2');
    if (/^\[.*\]$/.test(v))
      v = v
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^(['"])(.*)\1$/, '$2'))
        .filter(Boolean);
    meta[kv[1].toLowerCase()] = v;
  }
  return ok ? { meta, content: src.slice(m[0].length) } : { meta: {}, content: src };
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const slugOk = (s?: string) => (s && /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(s) ? s : undefined);

export function issuesLoader(kind: 'post' | 'note'): Loader {
  return {
    name: `github-issues-${kind}`,
    load: async ({ store, renderMarkdown, generateDigest, logger, watcher, parseData }) => {
      const path = fileURLToPath(FILE);
      const sync = async () => {
        let data: IssuesFile;
        try {
          data = JSON.parse(await readFile(path, 'utf8'));
        } catch (e) {
          logger.warn(`读取 issues.json 失败：${(e as Error).message}`);
          data = { repo: '', issues: [] };
        }
        store.clear();
        const used = new Set<string>();
        for (const issue of data.issues.filter((i) => i.kind === kind)) {
          const { meta, content } = splitFront(issue.body);
          let id = slugOk(str(meta.slug)) ?? String(issue.number);
          if (used.has(id)) id = String(issue.number);
          used.add(id);
          const comments = await Promise.all(
            issue.comments.map(async (c) => ({ ...c, html: (await renderMarkdown(c.body)).html })),
          );
          const rendered = await renderMarkdown(content);
          const metaTags = Array.isArray(meta.tags) ? meta.tags : str(meta.tags) ? [str(meta.tags)!] : [];
          const entryData = {
            title: issue.title,
            date: str(meta.date) ?? issue.createdAt,
            updated: issue.updatedAt,
            description: str(meta.description) ?? '',
            cover: str(meta.cover) ?? firstImage(content),
            mood: str(meta.mood),
            weather: str(meta.weather),
            tags: [...new Set([...issue.tags, ...metaTags])],
            lang: issue.lang,
            draft: false,
            archived: issue.state === 'closed',
            locked: issue.locked,
            number: issue.number,
            url: issue.url,
            repo: data.repo,
            reactions: issue.reactions,
            comments,
          };
          const parsed = await parseData({ id, data: entryData });
          store.set({ id, data: parsed, body: content, rendered, digest: generateDigest({ issue, id }) });
        }
      };
      await sync();
      watcher?.add(path);
      watcher?.on('change', (p) => p === path && sync());
    },
  };
}
