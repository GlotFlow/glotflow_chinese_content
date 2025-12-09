#!/usr/bin/env tsx

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { FeedSchema, BookManifestSchema } from './types.js';
import { findFiles } from './utils/files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

async function validateFeed(): Promise<ValidationResult> {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };
  const feedPath = join(PUBLIC_DIR, 'discover', 'feed.json');

  if (!existsSync(feedPath)) {
    result.valid = false;
    result.errors.push('feed.json not found - run build first');
    return result;
  }

  try {
    const content = await readFile(feedPath, 'utf-8');
    const feed = JSON.parse(content);

    // Validate schema
    const parsed = FeedSchema.safeParse(feed);
    if (!parsed.success) {
      result.valid = false;
      result.errors.push(`Feed schema validation failed: ${parsed.error.message}`);
      return result;
    }

    const validFeed = parsed.data;

    // Check for empty required fields
    for (const item of validFeed.items) {
      if (!item.title.zh) {
        result.errors.push(`Item ${item.id}: Missing Chinese title`);
        result.valid = false;
      }

      if (!item.difficulty) {
        result.warnings.push(`Item ${item.id}: Missing difficulty`);
      }

      if (item.categories.length === 0) {
        result.warnings.push(`Item ${item.id}: No categories assigned`);
      }

      // Check book-specific fields
      if (item.type === 'book') {
        if (!item.manifestUrl) {
          result.errors.push(`Book ${item.id}: Missing manifestUrl`);
          result.valid = false;
        }
        if (!item.chaptersCount || item.chaptersCount === 0) {
          result.warnings.push(`Book ${item.id}: No chapters found`);
        }
      }

      // Check pagebook-specific fields
      if (item.type === 'pagebook') {
        if (!item.homeUrl) {
          result.errors.push(`PageBook ${item.id}: Missing homeUrl`);
          result.valid = false;
        }
      }
    }

    // Check featured items exist
    const itemIds = new Set(validFeed.items.map(i => i.id));
    for (const featuredId of validFeed.featured) {
      if (!itemIds.has(featuredId)) {
        result.warnings.push(`Featured item not found: ${featuredId}`);
      }
    }

    // Check categories are used
    const usedCategories = new Set(validFeed.items.flatMap(i => i.categories));
    for (const cat of validFeed.categories) {
      if (!usedCategories.has(cat.id)) {
        result.warnings.push(`Category not used: ${cat.id}`);
      }
    }

    console.log(`✓ Feed validated: ${validFeed.items.length} items`);
  } catch (err) {
    result.valid = false;
    result.errors.push(`Failed to parse feed.json: ${err}`);
  }

  return result;
}

async function validateManifests(): Promise<ValidationResult> {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };
  const manifestFiles = await findFiles('books/*/_index.json', PUBLIC_DIR);

  for (const manifestPath of manifestFiles) {
    const bookId = manifestPath.split('/').slice(-2, -1)[0];

    try {
      const content = await readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      const parsed = BookManifestSchema.safeParse(manifest);
      if (!parsed.success) {
        result.valid = false;
        result.errors.push(`Book ${bookId} manifest invalid: ${parsed.error.message}`);
        continue;
      }

      const validManifest = parsed.data;

      // Check chapters have content
      if (validManifest.chapters.length === 0) {
        result.warnings.push(`Book ${bookId}: No chapters`);
      }

      // Check chapter files exist
      for (const chapter of validManifest.chapters) {
        const chapterPath = join(PUBLIC_DIR, 'books', bookId, chapter.file);
        if (!existsSync(chapterPath)) {
          result.errors.push(`Book ${bookId}: Chapter file not found: ${chapter.file}`);
          result.valid = false;
        }
      }

      console.log(`✓ Book ${bookId}: ${validManifest.chapters.length} chapters`);
    } catch (err) {
      result.valid = false;
      result.errors.push(`Failed to validate book ${bookId}: ${err}`);
    }
  }

  return result;
}

async function main() {
  console.log('🔍 Validating build output...\n');

  const feedResult = await validateFeed();
  const manifestResult = await validateManifests();

  const allErrors = [...feedResult.errors, ...manifestResult.errors];
  const allWarnings = [...feedResult.warnings, ...manifestResult.warnings];

  console.log('');

  if (allWarnings.length > 0) {
    console.log('⚠️  Warnings:');
    allWarnings.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }

  if (allErrors.length > 0) {
    console.log('❌ Errors:');
    allErrors.forEach(e => console.log(`   - ${e}`));
    console.log('');
    console.log('Validation FAILED');
    process.exit(1);
  }

  console.log('✅ Validation passed!');
}

main().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
