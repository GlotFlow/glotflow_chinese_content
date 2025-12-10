import { marked } from 'marked';

// Configure marked for Chinese content
marked.setOptions({
  gfm: true,        // GitHub Flavored Markdown
  breaks: true,     // Convert \n to <br>
});

/**
 * Rewrite relative image paths to absolute CDN-friendly paths
 * Books: ../images/004.png -> /images/books/{bookSlug}/004.png
 * Articles: ./images/image.png -> /images/articles/image.png
 */
export function rewriteImagePaths(markdown: string, imageBasePath?: string): string {
  if (!imageBasePath) return markdown;

  // Replace ../images/ (book chapters) with the absolute path
  let result = markdown.replace(
    /\(\.\.\/images\//g,
    `(${imageBasePath}/`
  );

  // Replace ./images/ (articles) with the absolute path
  result = result.replace(
    /\(\.\/images\//g,
    `(${imageBasePath}/`
  );

  return result;
}

/**
 * Convert markdown content to HTML with a wrapper suitable for WebView rendering
 */
export function markdownToHtml(markdown: string, title?: string, imageBasePath?: string): string {
  // Rewrite image paths before converting
  const processedMarkdown = rewriteImagePaths(markdown, imageBasePath);
  const content = marked.parse(processedMarkdown) as string;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${title ? `<title>${escapeHtml(title)}</title>` : ''}
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Noto Serif SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", serif;
      line-height: 1.8;
      padding: 16px;
      margin: 0;
      color: #333;
      background: #fff;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.4;
    }
    h1 { font-size: 1.5em; }
    h2 { font-size: 1.3em; }
    h3 { font-size: 1.1em; }
    p {
      margin: 1em 0;
      text-align: justify;
    }
    ul, ol {
      padding-left: 1.5em;
      margin: 1em 0;
    }
    li {
      margin: 0.5em 0;
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 2em 0;
    }
    strong {
      font-weight: 600;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }
    blockquote {
      margin: 1em 0;
      padding: 0.5em 1em;
      border-left: 3px solid #ddd;
      color: #666;
      background: #f9f9f9;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em auto;
      border-radius: 8px;
    }
    /* Vocabulary section styling */
    p strong:first-child {
      color: #1565C0;
    }
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      body {
        background: #1a1a1a;
        color: #e0e0e0;
      }
      hr {
        border-top-color: #444;
      }
      code {
        background: #2a2a2a;
      }
      blockquote {
        border-left-color: #444;
        background: #222;
        color: #aaa;
      }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Convert markdown to simple HTML (no wrapper, just content)
 */
export function markdownToHtmlContent(markdown: string): string {
  return marked.parse(markdown) as string;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
