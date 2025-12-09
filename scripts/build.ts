#!/usr/bin/env tsx

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { loadConfig, loadBooks, loadPagebooks, loadArticles } from './utils/loaders.js';
import { writeJsonFile, copyDir, copyFileToDir, fileExists } from './utils/files.js';
import type { Feed, FeedItem, BookManifest } from './types.js';

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

  // Build feed items
  const items: FeedItem[] = [
    ...books.map(({ loadedChapters, ...book }) => book as FeedItem),
    ...pagebooks.map(pb => pb as FeedItem),
    ...articles.map(a => a as FeedItem),
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

  // Generate book manifests and copy chapters
  for (const book of books) {
    const bookDir = join(PUBLIC_DIR, 'books', book.id);
    await mkdir(bookDir, { recursive: true });

    // Create manifest
    const manifest: BookManifest = {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author,
      description: book.description,
      coverUrl: book.imageUrl ? book.imageUrl.replace(`books/${book.id}/`, '') : undefined,
      difficulty: book.difficulty,
      totalChapters: book.loadedChapters.length,
      status: book.status || 'ongoing',
      chapters: book.loadedChapters,
    };

    await writeJsonFile(join(bookDir, '_index.json'), manifest);

    // Copy cover image
    const sourceBookDir = join(CONTENT_DIR, 'books', book.id);
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
      const coverPath = join(sourceBookDir, `cover${ext}`);
      if (await fileExists(coverPath)) {
        await copyFileToDir(coverPath, bookDir);
        break;
      }
    }

    // Copy chapters
    const sourceChaptersDir = join(sourceBookDir, 'chapters');
    const destChaptersDir = join(bookDir, 'chapters');
    await copyDir(sourceChaptersDir, destChaptersDir);

    console.log(`✓ Generated books/${book.id}/ (${book.loadedChapters.length} chapters)`);
  }

  // Copy article content
  for (const article of articles) {
    const sourceArticleDir = join(CONTENT_DIR, 'articles', article.id);
    const destArticleDir = join(PUBLIC_DIR, 'articles', article.id);
    await copyDir(sourceArticleDir, destArticleDir);
    console.log(`✓ Copied articles/${article.id}/`);
  }

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
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
