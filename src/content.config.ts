import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([]),
    draft: z.boolean().optional().default(false),
    /** 文章语言，默认中文 */
    lang: z.enum(['zh', 'en']).optional().default('zh'),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    mood: z.string().optional(),
    weather: z.string().optional(),
    draft: z.boolean().optional().default(false),
    lang: z.enum(['zh', 'en']).optional().default('zh'),
  }),
});

export const collections = { posts, notes };
