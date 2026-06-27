'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const defaultConfigPath = path.join(root, 'tools', 'i18n', 'config.json');

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function extractObjectBlock(src, objectKey) {
  const marker = new RegExp(`\\b${objectKey}\\b\\s*(?::|=)\\s*\\{`, 'm');
  const match = marker.exec(src);
  if (!match) return '';
  let index = match.index + match[0].length;
  let depth = 1;
  let quote = null;
  let escaped = false;
  const start = index;

  while (index < src.length) {
    const ch = src[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
    } else if (ch === '\'' || ch === '"' || ch === '`') {
      quote = ch;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(start, index);
    }
    index++;
  }

  return src.slice(start);
}

function keysFromObjectBlock(block) {
  return new Set([...block.matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map(match => match[1]));
}

function usedDataI18nKeys(html) {
  return new Set([...html.matchAll(/\bdata-i18n(?:-[A-Za-z0-9_-]+)?=["']([^"']+)["']/g)].map(match => match[1]));
}

function usedFunctionKeys(src, functions) {
  const keys = new Set();
  for (const fn of functions || []) {
    const pattern = new RegExp(`\\b${fn}\\(\\s*["']([^"']+)["']`, 'g');
    for (const match of src.matchAll(pattern)) keys.add(match[1]);
  }
  return keys;
}

function stripHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '');
}

function visibleTextWithoutI18n(html, tags) {
  const cleaned = stripHtml(html);
  const problems = [];
  for (const tag of tags || []) {
    const pattern = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    for (const match of cleaned.matchAll(pattern)) {
      const attrs = match[1];
      if (/\bdata-i18n(?:-[A-Za-z0-9_-]+)?=/.test(attrs) || /\bdata-i18n-ignore\b/.test(attrs)) continue;
      const text = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (text) problems.push(`text in <${tag}> lacks data-i18n: "${text}"`);
    }
  }
  return problems;
}

function checkPage(page, languages) {
  const html = readText(page.html);
  const translationSrc = readText(page.translations);
  const translationRoot = page.translationObject
    ? extractObjectBlock(translationSrc, page.translationObject)
    : translationSrc;
  const sourceFiles = [html, translationSrc]
    .concat((page.sources || []).map(readText));
  const functions = page.i18nFunctions || [];
  const problems = [];

  const translationKeys = Object.fromEntries(
    languages.map(lang => [lang, keysFromObjectBlock(extractObjectBlock(translationRoot, lang))]),
  );
  const allTranslationKeys = new Set(languages.flatMap(lang => [...translationKeys[lang]]));
  const usedKeys = usedDataI18nKeys(html);

  for (const src of sourceFiles) {
    for (const key of usedFunctionKeys(src, functions)) usedKeys.add(key);
  }

  for (const lang of languages) {
    for (const key of usedKeys) {
      if (!translationKeys[lang].has(key)) {
        problems.push(`${lang}: missing translation for used key "${key}"`);
      }
    }
  }

  for (const lang of languages) {
    for (const key of allTranslationKeys) {
      if (!translationKeys[lang].has(key)) {
        problems.push(`${lang}: missing key "${key}" present in another language`);
      }
    }
  }

  problems.push(...visibleTextWithoutI18n(html, page.textTags));

  return {
    name: page.name || page.html,
    usedKeyCount: usedKeys.size,
    dictionaryKeyCount: allTranslationKeys.size,
    problems,
  };
}

function loadConfig() {
  const configPathArg = process.argv.find(arg => arg.startsWith('--config='));
  const configPath = configPathArg
    ? path.resolve(root, configPathArg.slice('--config='.length))
    : defaultConfigPath;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function main() {
  const config = loadConfig();
  const languages = config.languages || ['en', 'ja'];
  const pageFilter = process.argv.find(arg => arg.startsWith('--page='))?.slice('--page='.length);
  const pages = (config.pages || []).filter(page => !pageFilter || page.name === pageFilter);
  const results = pages.map(page => checkPage(page, languages));
  const problems = results.flatMap(result => result.problems.map(problem => `${result.name}: ${problem}`));

  if (problems.length) {
    console.error('i18n check failed:');
    for (const problem of problems) console.error(` - ${problem}`);
    process.exit(1);
  }

  for (const result of results) {
    console.log(`${result.name}: ${result.usedKeyCount} used keys covered by ${result.dictionaryKeyCount} dictionary keys`);
  }
}

main();
