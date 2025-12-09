import { z } from 'zod';

// Localized string schema
export const LocalizedStringSchema = z.object({
  zh: z.string(),
  en: z.string().optional(),
  vi: z.string().optional(),
});

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

// Content status
export const ContentStatusSchema = z.enum(['complete', 'ongoing', 'hiatus']);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

// Item types
export const ItemTypeSchema = z.enum(['book', 'pagebook', 'article']);
export type ItemType = z.infer<typeof ItemTypeSchema>;

// Category schema
export const CategorySchema = z.object({
  id: z.string(),
  name: LocalizedStringSchema,
  icon: z.string(),
  order: z.number(),
});

export type Category = z.infer<typeof CategorySchema>;

// Book chapter schema
export const BookChapterSchema = z.object({
  id: z.string(),
  title: LocalizedStringSchema,
  file: z.string(),
  wordCount: z.number().optional(),
});

export type BookChapter = z.infer<typeof BookChapterSchema>;

// Book meta schema
export const BookMetaSchema = z.object({
  id: z.string(),
  type: z.literal('book'),
  title: LocalizedStringSchema,
  subtitle: LocalizedStringSchema.optional(),
  author: LocalizedStringSchema.optional(),
  description: LocalizedStringSchema.optional(),
  difficulty: z.string(),
  categories: z.array(z.string()),
  status: ContentStatusSchema.optional(),
  chapters: z.array(BookChapterSchema).optional(),
});

export type BookMeta = z.infer<typeof BookMetaSchema>;

// PageBook schema
export const PageBookSchema = z.object({
  id: z.string(),
  type: z.literal('pagebook'),
  title: LocalizedStringSchema,
  subtitle: LocalizedStringSchema.optional(),
  description: LocalizedStringSchema.optional(),
  imageUrl: z.string().optional(),
  homeUrl: z.string(),
  difficulty: z.string(),
  categories: z.array(z.string()),
});

export type PageBook = z.infer<typeof PageBookSchema>;

// Article schema
export const ArticleMetaSchema = z.object({
  id: z.string(),
  type: z.literal('article'),
  title: LocalizedStringSchema,
  subtitle: LocalizedStringSchema.optional(),
  description: LocalizedStringSchema.optional(),
  difficulty: z.string(),
  categories: z.array(z.string()),
  wordCount: z.number().optional(),
});

export type ArticleMeta = z.infer<typeof ArticleMetaSchema>;

// Feed item (union of all types)
export const FeedItemSchema = z.discriminatedUnion('type', [
  BookMetaSchema.extend({
    imageUrl: z.string().optional(),
    manifestUrl: z.string().optional(),
    chaptersCount: z.number().optional(),
  }),
  PageBookSchema,
  ArticleMetaSchema.extend({
    sourceUrl: z.string().optional(),
  }),
]);

export type FeedItem = z.infer<typeof FeedItemSchema>;

// Book manifest (output format)
export const BookManifestSchema = z.object({
  id: z.string(),
  title: LocalizedStringSchema,
  subtitle: LocalizedStringSchema.optional(),
  author: LocalizedStringSchema.optional(),
  description: LocalizedStringSchema.optional(),
  coverUrl: z.string().optional(),
  difficulty: z.string(),
  totalChapters: z.number(),
  status: ContentStatusSchema,
  chapters: z.array(BookChapterSchema),
});

export type BookManifest = z.infer<typeof BookManifestSchema>;

// Feed schema
export const FeedSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  defaultLocale: z.string(),
  supportedLocales: z.array(z.string()),
  categories: z.array(CategorySchema),
  featured: z.array(z.string()),
  items: z.array(FeedItemSchema),
});

export type Feed = z.infer<typeof FeedSchema>;

// Config schemas
export const SettingsSchema = z.object({
  version: z.string(),
  defaultLocale: z.string(),
  supportedLocales: z.array(z.string()),
});

export const CategoriesConfigSchema = z.object({
  categories: z.array(CategorySchema),
});

export const FeaturedConfigSchema = z.object({
  featured: z.array(z.string()),
});
