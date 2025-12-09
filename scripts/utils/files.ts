import { readFile, writeFile, mkdir, copyFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, relative, extname } from 'path';
import { parse as parseYaml } from 'yaml';
import matter from 'gray-matter';
import { glob } from 'glob';

export async function readYamlFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  return parseYaml(content) as T;
}

export async function readMarkdownFile(filePath: string): Promise<{ content: string; data: Record<string, unknown> }> {
  const content = await readFile(filePath, 'utf-8');
  const parsed = matter(content);
  return {
    content: parsed.content,
    data: parsed.data,
  };
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function copyFileToDir(src: string, destDir: string, filename?: string): Promise<void> {
  if (!existsSync(destDir)) {
    await mkdir(destDir, { recursive: true });
  }
  const destFile = join(destDir, filename || src.split('/').pop()!);
  await copyFile(src, destFile);
}

export async function copyDir(src: string, dest: string): Promise<void> {
  if (!existsSync(src)) return;

  if (!existsSync(dest)) {
    await mkdir(dest, { recursive: true });
  }

  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

export async function findFiles(pattern: string, cwd: string): Promise<string[]> {
  return glob(pattern, { cwd, absolute: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function countChineseCharacters(text: string): number {
  // Match CJK characters
  const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/g;
  const matches = text.match(cjkRegex);
  return matches ? matches.length : 0;
}

export function getRelativePath(from: string, to: string): string {
  return relative(from, to);
}

export function changeExtension(filePath: string, newExt: string): string {
  const ext = extname(filePath);
  return filePath.slice(0, -ext.length) + newExt;
}
