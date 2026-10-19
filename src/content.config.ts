import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { markdownLoader } from './lib/content-loader.mjs';

const articleSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  timelinePhase: z.enum(['pre-svm']).optional(),
  timelineLabel: z.string().max(12).optional(),

  // ---- 访客投稿相关（团队自撰的文章留空即可）----
  /** 投稿者署名。留空表示由项目组撰写 */
  author: z.string().optional(),
  /** 来源：team = 项目组自撰；guest = 访客投稿（经审核后发布） */
  source: z.enum(['team', 'guest']).default('team'),
  /** 访客投稿对应的 GitHub Issue 编号，用于追溯与讨论 */
  issue: z.string().regex(/^\d+$/).optional(),
});

export const collections = {
  progress: defineCollection({
    loader: markdownLoader('progress'),
    schema: articleSchema,
  }),
  outlook: defineCollection({
    loader: markdownLoader('outlook'),
    schema: articleSchema,
  }),
  notes: defineCollection({
    loader: markdownLoader('notes'),
    schema: articleSchema,
  }),
};
