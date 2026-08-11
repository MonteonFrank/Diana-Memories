#!/usr/bin/env node
/**
 * build-themes.js
 *
 * Scans src/content/letters/ for Markdown files, tokenizes all text,
 * filters English + Spanish stop words, counts word frequencies, and
 * writes the top 35 results to public/data/themes.json as:
 *   [{ "text": "love", "weight": 42 }, ...]
 *
 * Usage: node scripts/build-themes.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const LETTERS_DIR  = path.resolve(__dirname, '../src/content/letters');
const OUTPUT_FILE  = path.resolve(__dirname, '../public/data/themes.json');
const TOP_N        = 35;

// ---------------------------------------------------------------------------
// Stop words  (English + Spanish)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  // English
  'a','about','above','after','again','against','all','am','an','and','any',
  'are','aren','as','at','be','because','been','before','being','below',
  'between','both','but','by','can','couldn','did','didn','do','does',
  'doesn','doing','don','down','during','each','few','for','from','further',
  'get','got','had','hadn','has','hasn','have','haven','having','he','her',
  'here','hers','herself','him','himself','his','how','i','if','in','into',
  'is','isn','it','its','itself','just','ll','me','might','more','most',
  'mustn','my','myself','no','nor','not','now','of','off','on','once',
  'only','or','other','our','ours','ourselves','out','over','own','re',
  's','same','shan','she','should','shouldn','so','some','such','t','than',
  'that','the','their','theirs','them','themselves','then','there','these',
  'they','this','those','through','to','too','under','until','up','us',
  've','very','was','wasn','we','were','weren','what','when','where',
  'which','while','who','whom','why','will','with','won','would','wouldn',
  'you','your','yours','yourself','yourselves','also','even','can','could',
  'may','might','shall','will','would','one','two','three','first','said',
  'like','know','think','want','go','going','back','get','make','see','come',
  'time','way','day','year','good','great','little','things','thing','always',
  'never','every','well','look','feel','much','many','still','ll','ve','re',
  'd','m','ll','s','t','okay','ok',

  // Spanish
  'a','al','algo','algunas','algunos','ante','antes','como','con','contra',
  'cual','cuales','cuando','de','del','desde','donde','durante','e','el',
  'ella','ellas','ellos','en','entre','era','eres','es','esa','esas','ese',
  'eso','esos','esta','estaba','estaban','estado','estamos','estan','estar',
  'estas','este','esto','estos','estoy','fue','fueron','fui','ha','hace',
  'hacen','hacer','hacia','han','has','hasta','hay','he','hemos','her',
  'hizo','igual','la','las','le','les','lo','los','me','mi','mis','mismo',
  'mucho','muchos','muy','ni','no','nos','nosotros','nuestra','nuestro',
  'o','os','otra','otras','otro','otros','para','pero','por','que','quien',
  'quienes','se','sea','ser','si','sin','sobre','son','su','sus','tambien',
  'también','tanto','te','ti','tiene','tienen','todo','todos','tu','tus',
  'un','una','unas','unos','vos','ya','yo','él','es','les','más','sí',
  'así','fue','él','mi','si','más','aún','hoy','bien','entonces','ahora',
  'cada','solo','sólo','aquí','allí','allá','acá','porque','aunque','sino',
  'donde','cuando','como','este','esta','ese','esa','aquel','aquella',
  'esos','esas','estos','estas','ser','estar','haber','tener','hacer',
  'poder','ir','ver','dar','saber','querer','llegar','pasar','deber','poner',
]);

// ---------------------------------------------------------------------------
// Markdown stripping
// ---------------------------------------------------------------------------

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')   // fenced code blocks
    .replace(/`[^`]*`/g, ' ')           // inline code
    .replace(/!\[.*?\]\(.*?\)/g, ' ')   // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → keep label text
    .replace(/^#{1,6}\s+/gm, ' ')       // ATX headings
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // bold/italic
    .replace(/^\s*[-*+]\s+/gm, ' ')     // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, ' ')     // ordered list markers
    .replace(/^\s*>\s+/gm, ' ')         // blockquotes
    .replace(/---+|===+/g, ' ')         // horizontal rules / setext headings
    .replace(/&[a-zA-Z]+;/g, ' ')       // HTML entities
    .replace(/<[^>]+>/g, ' ');          // any remaining HTML tags
}

// ---------------------------------------------------------------------------
// Tokenization
// ---------------------------------------------------------------------------

function tokenize(text) {
  return text
    .toLowerCase()
    // keep letters (including accented Spanish chars) and apostrophes
    .replace(/[^a-záéíóúüñ']/gi, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^'+|'+$/g, '')) // strip surrounding apostrophes
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ---------------------------------------------------------------------------
// Frequency counting
// ---------------------------------------------------------------------------

function countFrequencies(tokens) {
  const freq = Object.create(null);
  for (const token of tokens) {
    freq[token] = (freq[token] || 0) + 1;
  }
  return freq;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // Validate source directory
  if (!fs.existsSync(LETTERS_DIR)) {
    console.error(
      `[build-themes] Directory not found: ${LETTERS_DIR}\n` +
      `  Create the directory and add .md files to generate themes.json.\n` +
      `  Skipping output — no file written.`
    );
    process.exit(0); // non-fatal: missing letters is acceptable at build time
  }

  // Collect Markdown files
  const mdFiles = fs.readdirSync(LETTERS_DIR)
    .filter(f => f.endsWith('.md') || f.endsWith('.markdown'))
    .map(f => path.join(LETTERS_DIR, f));

  if (mdFiles.length === 0) {
    console.warn('[build-themes] No Markdown files found in', LETTERS_DIR);
    console.warn('  Writing empty themes array to', OUTPUT_FILE);
  }

  // Read, strip, and tokenize all files
  const allTokens = [];
  for (const filePath of mdFiles) {
    try {
      const raw      = fs.readFileSync(filePath, 'utf8');
      const stripped = stripMarkdown(raw);
      const tokens   = tokenize(stripped);
      allTokens.push(...tokens);
      console.log(`[build-themes] Processed: ${path.basename(filePath)} → ${tokens.length} tokens`);
    } catch (err) {
      console.warn(`[build-themes] Could not read ${filePath}: ${err.message}`);
    }
  }

  // Count & sort
  const freq   = countFrequencies(allTokens);
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([text, weight]) => ({ text, weight }));

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2), 'utf8');

  console.log(`[build-themes] Done. Top ${sorted.length} words written to ${OUTPUT_FILE}`);
  if (sorted.length > 0) {
    console.log('  Preview:', sorted.slice(0, 5).map(w => `${w.text}(${w.weight})`).join(', '), '...');
  }
}

main();
