import { defineCollection, z } from 'astro:content';

const base = {
  title: z.string(),
  // YAML 会把未加引号的 2026-09-01 解析成 Date，先归一化为 YYYY-MM-DD 字符串再校验
  date: z.preprocess(
    (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date 需为 YYYY-MM-DD'),
  ),
  summary: z.string().optional(),
  draft: z.boolean().default(false),
};

export const collections = {
  notes: defineCollection({
    type: 'content',
    schema: z.object({ ...base, tags: z.array(z.string()).default([]) }),
  }),
  musings: defineCollection({
    type: 'content',
    schema: z.object({ ...base }),
  }),
  links: defineCollection({
    type: 'content',
    schema: z.object({
      ...base,
      url: z.string().url(),
      tags: z.array(z.string()).default([]),
    }),
  }),
  projects: defineCollection({
    type: 'content',
    schema: z.object({
      ...base,
      tech: z.array(z.string()),
      url: z.string().url().optional(),
      // 允许 https(s):// 或 git@host:path 形式的仓库引用（防 javascript: 等进 href）
      repo: z
        .string()
        .refine((v) => /^https?:\/\//i.test(v) || /^git@[^:]+:.+/.test(v) || /^ssh:\/\//.test(v),
          'repo 需为 http(s)://、ssh:// 或 git@host:path 形式')
        .optional(),
    }).superRefine((p, ctx) => {
      if (!p.url && !p.repo) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'projects 的 url 与 repo 至少提供一个' });
      }
    }),
  }),
  series: defineCollection({
    type: 'content',
    schema: z.object({
      ...base,
      location: z.string().optional(),
      workName: z.string().optional(), // §75 作品名：画廊封面字幕优先显示它（缺省回落 location）
      cover: z.string(), // 卷封面 = 卷内某照片的 slug
    }),
  }),
  photos: defineCollection({
    type: 'content',
    schema: ({ image }) =>
      z.object({
        ...base,
        image: image(), // 相对路径 = 与本 .md 同目录的同名文件
        alt: z.string().min(1, 'alt 必填'),
        location: z.string().optional(),
        album: z.string().optional(),
        series: z.string().optional(), // 所属卷（对应 series slug），有则挂靠胶片
        camera: z
          .object({
            body: z.string().optional(),
            lens: z.string().optional(),
            f: z.string().optional(),
            ss: z.string().optional(),
            iso: z.string().optional(),
          })
          .optional(),
      }),
  }),
};
