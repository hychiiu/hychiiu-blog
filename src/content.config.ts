import { defineCollection } from 'astro:content';
import { issuesLoader } from './utils/issues-loader';
import { entrySchema, noteSchema } from './utils/issue-schema';

// 文章 / 手记都来自 GitHub Issues（见 scripts/sync-issues.mjs 与 README）
const posts = defineCollection({ loader: issuesLoader('post'), schema: entrySchema });
const notes = defineCollection({ loader: issuesLoader('note'), schema: noteSchema });

export const collections = { posts, notes };
