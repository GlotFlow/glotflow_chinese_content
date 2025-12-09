#!/usr/bin/env tsx

import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { mkdir, rm, readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { loadConfig, loadBooks, loadPagebooks, loadArticles } from './utils/loaders.js';
import { writeJsonFile, copyDir, copyFileToDir, fileExists, readMarkdownFile } from './utils/files.js';
import { markdownToHtml } from './utils/markdown.js';
import type { Feed, FeedItem, BookManifest, BookChapter } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_DIR = join(__dirname, '..');
const PUBLIC_DIR = join(BASE_DIR, 'public');
const CONTENT_DIR = join(BASE_DIR, 'content');

async function cleanPublicDir() {
  if (existsSync(PUBLIC_DIR)) {
    await rm(PUBLIC_DIR, { recursive: true });
  }
  await mkdir(PUBLIC_DIR, { recursive: true });
}

/**
 * Convert chapter markdown files to HTML and update file references
 */
async function processBookChapters(
  sourceChaptersDir: string,
  destChaptersDir: string,
  chapters: BookChapter[],
  bookTitle: string
): Promise<BookChapter[]> {
  await mkdir(destChaptersDir, { recursive: true });

  const updatedChapters: BookChapter[] = [];

  for (const chapter of chapters) {
    const mdFileName = chapter.file.replace('chapters/', '');
    const sourcePath = join(sourceChaptersDir, mdFileName);

    if (await fileExists(sourcePath)) {
      // Read markdown content
      const { content } = await readMarkdownFile(sourcePath);

      // Convert to HTML with title
      const chapterTitle = chapter.title.zh || chapter.title.en || `Chapter ${chapter.id}`;
      const html = markdownToHtml(content, `${bookTitle} - ${chapterTitle}`);

      // Write HTML file
      const htmlFileName = mdFileName.replace('.md', '.html');
      const destPath = join(destChaptersDir, htmlFileName);
      await writeFile(destPath, html, 'utf-8');

      // Update chapter reference to .html
      updatedChapters.push({
        ...chapter,
        file: `chapters/${htmlFileName}`,
      });
    } else {
      updatedChapters.push(chapter);
    }
  }

  return updatedChapters;
}

/**
 * Convert article markdown to HTML (new flat file format)
 */
async function processArticleFile(
  sourcePath: string,
  destDir: string,
  articleSlug: string,
  articleTitle: string
): Promise<string> {
  await mkdir(destDir, { recursive: true });

  const { content } = await readMarkdownFile(sourcePath);
  const html = markdownToHtml(content, articleTitle);

  const htmlPath = join(destDir, `${articleSlug}.html`);
  await writeFile(htmlPath, html, 'utf-8');

  return `${articleSlug}.html`;
}

async function build() {
  console.log('🚀 Starting build...\n');

  // Clean public directory
  await cleanPublicDir();
  console.log('✓ Cleaned public directory');

  // Load configuration
  const config = await loadConfig(BASE_DIR);
  console.log(`✓ Loaded config: ${config.categories.length} categories, ${config.featured.length} featured`);

  // Load all content types
  const books = await loadBooks(BASE_DIR);
  console.log(`✓ Loaded ${books.length} books`);

  const pagebooks = await loadPagebooks(BASE_DIR);
  console.log(`✓ Loaded ${pagebooks.length} pagebooks`);

  const articles = await loadArticles(BASE_DIR);
  console.log(`✓ Loaded ${articles.length} articles`);

  // Process books: convert chapters to HTML
  const processedBooks: typeof books = [];
  for (const book of books) {
    const bookDir = join(PUBLIC_DIR, 'books', book.id);
    const sourceBookDir = join(CONTENT_DIR, 'books', book.id);
    const sourceChaptersDir = join(sourceBookDir, 'chapters');
    const destChaptersDir = join(bookDir, 'chapters');

    // Convert chapters to HTML
    const updatedChapters = await processBookChapters(
      sourceChaptersDir,
      destChaptersDir,
      book.loadedChapters,
      book.title.zh || book.title.en || book.id
    );

    // Copy cover image
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
      const coverPath = join(sourceBookDir, `cover${ext}`);
      if (await fileExists(coverPath)) {
        await copyFileToDir(coverPath, bookDir);
        break;
      }
    }

    // Create manifest with updated chapter references
    const manifest: BookManifest = {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author,
      description: book.description,
      coverUrl: book.imageUrl ? book.imageUrl.replace(`books/${book.id}/`, '') : undefined,
      difficulty: book.difficulty,
      totalChapters: updatedChapters.length,
      status: book.status || 'ongoing',
      chapters: updatedChapters,
    };

    await writeJsonFile(join(bookDir, '_index.json'), manifest);

    processedBooks.push({
      ...book,
      loadedChapters: updatedChapters,
    });

    console.log(`✓ Generated books/${book.id}/ (${updatedChapters.length} HTML chapters)`);
  }

  // Process articles: convert to HTML (flat file format)
  const processedArticles: typeof articles = [];
  const articlesDestDir = join(PUBLIC_DIR, 'articles');
  for (const article of articles) {
    const sourcePath = join(CONTENT_DIR, 'articles', `${article.id}.md`);

    const outputFile = await processArticleFile(
      sourcePath,
      articlesDestDir,
      article.id,
      article.title.zh || article.title.en || article.id
    );

    processedArticles.push({
      ...article,
      sourceUrl: `articles/${outputFile}`,
    });

    console.log(`✓ Generated articles/${outputFile}`);
  }

  // Build feed items with updated references
  const items: FeedItem[] = [
    ...processedBooks.map(({ loadedChapters, ...book }) => book as FeedItem),
    ...pagebooks.map(pb => pb as FeedItem),
    ...processedArticles.map(a => a as FeedItem),
  ];

  // Create feed
  const feed: Feed = {
    version: config.settings.version,
    lastUpdated: new Date().toISOString(),
    defaultLocale: config.settings.defaultLocale,
    supportedLocales: config.settings.supportedLocales,
    categories: config.categories,
    featured: config.featured,
    items,
  };

  // Validate featured items exist
  const itemIds = new Set(items.map(i => i.id));
  const missingFeatured = config.featured.filter(id => !itemIds.has(id));
  if (missingFeatured.length > 0) {
    console.warn(`⚠️  Warning: Featured items not found: ${missingFeatured.join(', ')}`);
  }

  // Write feed.json
  await mkdir(join(PUBLIC_DIR, 'discover'), { recursive: true });
  await writeJsonFile(join(PUBLIC_DIR, 'discover', 'feed.json'), feed);
  console.log('✓ Generated discover/feed.json');

  // Copy static images
  const staticImagesDir = join(BASE_DIR, 'static', 'images');
  if (existsSync(staticImagesDir)) {
    await copyDir(staticImagesDir, join(PUBLIC_DIR, 'images'));
    console.log('✓ Copied static images');
  }

  // Copy admin folder for Decap CMS
  const adminDir = join(BASE_DIR, 'admin');
  if (existsSync(adminDir)) {
    await copyDir(adminDir, join(PUBLIC_DIR, 'admin'));
    console.log('✓ Copied admin UI');
  }

  console.log('\n✅ Build complete!');
  console.log(`   Feed: ${items.length} items (${books.length} books, ${pagebooks.length} sites, ${articles.length} articles)`);
  console.log('   All chapters and articles converted to HTML');
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
