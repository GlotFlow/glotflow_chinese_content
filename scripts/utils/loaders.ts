import { join, basename, dirname } from 'path';
import { readdir } from 'fs/promises';
import {
  readYamlFile,
  readMarkdownFile,
  findFiles,
  fileExists,
  countChineseCharacters,
} from './files.js';
import type {
  BookMeta,
  BookChapter,
  PageBook,
  ArticleMeta,
  Category,
  LocalizedString,
} from '../types.js';
import {
  SettingsSchema,
  CategoriesConfigSchema,
  FeaturedConfigSchema,
  BookMetaSchema,
  PageBookSchema,
  ArticleMetaSchema,
  BookChapterSchema,
} from '../types.js';

const CONTENT_DIR = 'content';

interface Config {
  settings: {
    version: string;
    defaultLocale: string;
    supportedLocales: string[];
  };
  categories: Category[];
  featured: string[];
}

export async function loadConfig(baseDir: string): Promise<Config> {
  const configDir = join(baseDir, CONTENT_DIR, '_config');

  const settingsRaw = await readYamlFile(join(configDir, 'settings.yaml'));
  const settings = SettingsSchema.parse(settingsRaw);

  const categoriesRaw = await readYamlFile(join(configDir, 'categories.yaml'));
  const { categories } = CategoriesConfigSchema.parse(categoriesRaw);

  const featuredRaw = await readYamlFile(join(configDir, 'featured.yaml'));
  const { featured } = FeaturedConfigSchema.parse(featuredRaw);

  return { settings, categories, featured };
}

export async function loadBooks(baseDir: string): Promise<(BookMeta & {
  imageUrl?: string;
  manifestUrl?: string;
  chaptersCount?: number;
  loadedChapters: BookChapter[];
})[]> {
  const booksDir = join(baseDir, CONTENT_DIR, 'books');
  const books: (BookMeta & {
    imageUrl?: string;
    manifestUrl?: string;
    chaptersCount?: number;
    loadedChapters: BookChapter[];
  })[] = [];

  let bookDirs: string[];
  try {
    bookDirs = await readdir(booksDir);
  } catch {
    return books;
  }

  for (const bookSlug of bookDirs) {
    const bookDir = join(booksDir, bookSlug);
    const metaPath = join(bookDir, 'index.md');

    if (!(await fileExists(metaPath))) continue;

    const { data: metaRaw } = await readMarkdownFile(metaPath);
    const meta = BookMetaSchema.parse({ ...metaRaw, type: 'book' });

    // Load chapters
    const chaptersDir = join(bookDir, 'chapters');
    const loadedChapters = await loadBookChapters(chaptersDir, bookSlug);

    // Check for cover image
    let imageUrl: string | undefined;
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
      if (await fileExists(join(bookDir, `cover${ext}`))) {
        imageUrl = `books/${bookSlug}/cover${ext}`;
        break;
      }
    }

    books.push({
      ...meta,
      imageUrl,
      manifestUrl: `books/${bookSlug}/_index.json`,
      chaptersCount: loadedChapters.length,
      loadedChapters,
    });
  }

  return books;
}

async function loadBookChapters(chaptersDir: string, bookSlug: string): Promise<BookChapter[]> {
  const chapters: BookChapter[] = [];

  let files: string[];
  try {
    files = await readdir(chaptersDir);
  } catch {
    return chapters;
  }

  // Get all markdown files
  const mdFiles = files.filter(f => f.endsWith('.md')).sort();

  for (const mdFile of mdFiles) {
    const chapterId = basename(mdFile, '.md');
    const mdPath = join(chaptersDir, mdFile);
    const yamlPath = join(chaptersDir, `${chapterId}.yaml`);

    // Read markdown content
    const { content, data } = await readMarkdownFile(mdPath);
    const wordCount = countChineseCharacters(content);

    // Try to load separate yaml meta, or use frontmatter
    let title: LocalizedString;
    if (await fileExists(yamlPath)) {
      const yamlMeta = await readYamlFile<{ title: LocalizedString }>(yamlPath);
      title = yamlMeta.title;
    } else if (data.title) {
      // Frontmatter title
      title = typeof data.title === 'string'
        ? { zh: data.title }
        : data.title as LocalizedString;
    } else {
      // Fallback: use chapter ID
      title = { zh: `Chapter ${chapterId}` };
    }

    chapters.push({
      id: chapterId,
      title,
      file: `chapters/${mdFile}`,
      wordCount,
    });
  }

  return chapters;
}

export async function loadPagebooks(baseDir: string): Promise<PageBook[]> {
  const pagebooksDir = join(baseDir, CONTENT_DIR, 'pagebooks');
  const pagebooks: PageBook[] = [];

  const yamlFiles = await findFiles('*.yaml', pagebooksDir);

  for (const yamlPath of yamlFiles) {
    const raw = await readYamlFile(yamlPath);
    const pagebook = PageBookSchema.parse({ ...raw, type: 'pagebook' });
    pagebooks.push(pagebook);
  }

  return pagebooks;
}

export async function loadArticles(baseDir: string): Promise<(ArticleMeta & {
  sourceUrl?: string;
  wordCount?: number;
})[]> {
  const articlesDir = join(baseDir, CONTENT_DIR, 'articles');
  const articles: (ArticleMeta & { sourceUrl?: string; wordCount?: number })[] = [];

  let articleDirs: string[];
  try {
    articleDirs = await readdir(articlesDir);
  } catch {
    return articles;
  }

  for (const articleSlug of articleDirs) {
    const articleDir = join(articlesDir, articleSlug);
    const metaPath = join(articleDir, 'index.md');
    const contentPath = join(articleDir, 'content.md');

    if (!(await fileExists(metaPath))) continue;

    const { data: metaRaw } = await readMarkdownFile(metaPath);
    const meta = ArticleMetaSchema.parse({ ...metaRaw, type: 'article' });

    // Calculate word count from content
    let wordCount: number | undefined;
    if (await fileExists(contentPath)) {
      const { content } = await readMarkdownFile(contentPath);
      wordCount = countChineseCharacters(content);
    }

    articles.push({
      ...meta,
      sourceUrl: `articles/${articleSlug}/content.md`,
      wordCount,
    });
  }

  return articles;
}
