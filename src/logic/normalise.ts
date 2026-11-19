/**
 * Turns whatever the player typed (or an answer in the data) into a
 * comparable key: case-, accent- and punctuation-insensitive.
 *
 *   "  Khao-Söi! "  →  "khao soi"
 */

// Letters that Unicode NFKD does not split into "base + accent".
const SPECIAL_LETTERS: Record<string, string> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ı: 'i',
};

export function normalise(input: string): string {
  let s = input.toLowerCase().normalize('NFKD');
  // Strip combining accent marks left behind by NFKD (é → e + ´ → e).
  s = s.replace(/[̀-ͯ]/g, '');
  s = s.replace(/[ßæœøłđðþı]/g, (ch) => SPECIAL_LETTERS[ch] ?? ch);
  s = s.replace(/&/g, ' and ');
  // So C, C++ and C# stay different answers: "c++" → "c plus plus".
  s = s.replace(/\+/g, ' plus ').replace(/#/g, ' sharp ');
  // Apostrophes join words ("Rock'n'roll" → "rocknroll"); other punctuation splits them.
  s = s.replace(/['’‘`´]/g, '');
  s = s.replace(/[^a-z0-9]+/g, ' ');
  return s.trim().replace(/\s+/g, ' ');
}

/** The key with spaces removed, so "spider man" and "spiderman" meet. */
export function compact(key: string): string {
  return key.replace(/ /g, '');
}

/**
 * All the forms a key can be matched under: as typed, and with a leading
 * "the" removed ("the godfather" → "godfather"). Returned compacted.
 */
export function matchForms(input: string): string[] {
  const key = normalise(input);
  if (!key) return [];
  const forms = new Set([compact(key)]);
  if (key.startsWith('the ') && key.length > 4) forms.add(compact(key.slice(4)));
  return [...forms];
}
