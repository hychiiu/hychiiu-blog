import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { issuesLoader } from './utils/issues-loader';

// 文章 / 手记都来自 GitHub Issues（见 scripts/sync-issues.mjs 与 README）
const comment = z.object({
  id: z.number(),
  author: z.string(),
  avatar: z.string(),
  authorUrl: z.string(),
  association: z.string().optional(),
  body: z.string(),
  html: z.string(),
  url: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  reactions: z.record(z.string(), z.number()).optional(),
});

const issueFields = {
  title: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date(),
  description: z.string().optional().default(''),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  draft: z.boolean().optional().default(false),
  lang: z.enum(['zh', 'en']).optional().default('zh'),
  /** closed issue = 归档 */
  archived: z.boolean().default(false),
  locked: z.boolean().default(false),
  number: z.number(),
  url: z.string(),
  repo: z.string(),
  reactions: z.record(z.string(), z.number()).optional(),
  comments: z.array(comment).default([]),
};

const posts = defineCollection({ loader: issuesLoader('post'), schema: z.object(issueFields) });
const notes = defineCollection({
  loader: issuesLoader('note'),
  schema: z.object({ ...issueFields, mood: z.string().optional(), weather: z.string().optional() }),
});

export const collections = { posts, notes };
