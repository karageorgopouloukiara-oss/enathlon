/* Dizionario Scrabble. Parte pura (testabile) + loadDictionary (browser, Task 6). */

export function parseDictionary(text) {
  const set = new Set();
  for (const line of text.split('\n')) {
    const w = line.trim().toUpperCase();
    if (w) set.add(w);
  }
  return set;
}

export function isValid(dictSet, word) {
  if (!word) return false;
  return dictSet.has(word.toUpperCase());
}

/* Carica e mette in cache il dizionario della lingua. Solo browser. */
const FILES = { it: '../../assets/dict_it.txt', en: '../../assets/dict_en.txt' };
const cache = {};

export async function loadDictionary(lang) {
  if (cache[lang]) return cache[lang];
  const res = await fetch(FILES[lang]);
  if (!res.ok) throw new Error(`dizionario ${lang} non caricato (${res.status})`);
  const set = parseDictionary(await res.text());
  cache[lang] = set;
  return set;
}
