/**
 * Damerau-Levenshtein distance (the "optimal string alignment" variant):
 * the number of single-letter insertions, deletions, substitutions or
 * swaps of two neighbouring letters needed to turn `a` into `b`.
 *
 *   distance("ramne", "ramen") === 1   (one swap)
 *
 * `max` lets callers bail out early: once every cell in a row is above
 * `max`, the answer can only grow, so we return max + 1.
 */
export function damerauLevenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Three rolling rows: two back (for swaps), one back, current.
  let prevPrev = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1); // swap
      }
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    [prevPrev, prev, curr] = [prev, curr, prevPrev];
  }
  return prev[b.length];
}

/**
 * How many typos we forgive, by word length (letters, spaces excluded).
 * Under 4 letters there's no fuzzy matching at all: "cat" is one edit
 * from far too many other words.
 */
export function fuzzyThreshold(length: number): number {
  if (length < 4) return 0;
  if (length <= 5) return 1;
  if (length <= 11) return 2;
  return 3;
}
