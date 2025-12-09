# GlotFlow Content

Static content repository for [GlotFlow Chinese](https://github.com/glotflow/glotflow_chinese) Discover feature.

## Overview

This repository hosts curated Chinese learning content:
- **Books**: Full Chinese texts with chapters (public domain)
- **PageBooks**: Links to external Chinese learning sites
- **Articles**: Standalone Chinese learning articles

Content is written in YAML/Markdown and built into JSON feeds for the app.

## Quick Start

```bash
# Install dependencies
npm install

# Build content (generates JSON + copies files)
npm run build

# Validate output
npm run validate

# Watch mode (rebuild on changes)
npm run dev
```

## Project Structure

```
glotflow_content/
├── content/
│   ├── _config/
│   │   ├── settings.yaml      # Version, locales
│   │   ├── categories.yaml    # Category definitions
│   │   └── featured.yaml      # Featured item IDs
│   ├── books/
│   │   └── {book-slug}/
│   │       ├── _meta.yaml     # Book metadata
│   │       ├── cover.jpg      # Cover image (optional)
│   │       └── chapters/
│   │           ├── 001.yaml   # Chapter metadata
│   │           └── 001.md     # Chapter content
│   ├── pagebooks/
│   │   └── {site-slug}.yaml   # External site entries
│   └── articles/
│       └── {article-slug}/
│           ├── _meta.yaml     # Article metadata
│           └── content.md     # Article content
├── admin/                     # Decap CMS admin UI
├── scripts/                   # Build scripts
├── static/images/             # Shared images
└── public/                    # Build output (gitignored)
```

## Content Format

### Book Meta (`_meta.yaml`)

```yaml
id: my-book
title:
  zh: 中文标题
  en: English Title
  vi: Tiếng Việt
subtitle:
  zh: 副标题
  en: Subtitle
  vi: Phụ đề
difficulty: HSK1-HSK2
categories: [beginner, stories]
status: ongoing
```

### Chapter (`chapters/001.md`)

```markdown
# Chapter Title

Chinese content here...

---

**生词 (New Words):**
- 词语 (cíyǔ) - word
```

### PageBook (External Site)

```yaml
id: duchinese
title:
  zh: Du Chinese
  en: Du Chinese
homeUrl: https://www.duchinese.net/
difficulty: HSK1-HSK4
categories: [beginner, graded, sites]
```

## Multi-Language Support

All text fields support localization with fallback chain: `locale → en → zh`

Supported locales: `zh` (Chinese), `en` (English), `vi` (Vietnamese)

## Admin Interface

Visit `/admin/` to access Decap CMS for visual editing.

**Setup Requirements:**
1. Configure GitHub OAuth in `admin/config.yml`
2. Update `repo` to your GitHub repository
3. Deploy to GitHub Pages

## Deployment

Push to `main` branch triggers GitHub Actions:
1. Install dependencies
2. Build JSON feeds
3. Validate content
4. Deploy to GitHub Pages

## Output

After build, `public/` contains:

```
public/
├── discover/
│   └── feed.json           # Main content feed
├── books/
│   └── {book-slug}/
│       ├── _index.json     # Book manifest
│       ├── cover.jpg
│       └── chapters/
│           └── 001.md
├── articles/
│   └── {article-slug}/
│       └── content.md
├── images/
└── admin/                  # CMS interface
```

## License

Content: Various (see individual items)
Code: MIT
