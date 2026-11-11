/**
 * 文章 / 手记条目的 zod 模式（content.config.ts 使用），以及由此推导出的类型，供组件复用。
 */
import { z } from 'astro/zod';

const reactions = z.record(z.string(), z.number());

/** 构建时已渲染成 HTML 的评论 */
export const commentSchema = z.object({
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
  reactions: reactions.optional(),
});

/** 文章与手记共有的字段 */
export const entrySchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date(),
  description: z.string().optional().default(''),
  /** 封面：front block 的 cover，缺省为正文第一张图 */
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
  reactions: reactions.optional(),
  comments: z.array(commentSchema).default([]),
});

/** 手记额外的心情 / 天气 */
export const noteSchema = entrySchema.extend({
  mood: z.string().optional(),
  weather: z.string().optional(),
});

export type EntryComment = z.infer<typeof commentSchema>;
export type EntryData = z.infer<typeof entrySchema>;
