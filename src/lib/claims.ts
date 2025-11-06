// src/lib/claims.ts
/**
 * Claim extraction (phrase-level)
 * - Finds tokens: numbers/years, months/dates, quoted titles, capitalized entities
 * - Expands each token to a short phrase (within sentence) so the UI shows readable claims
 * - De-duplicates and sorts by position
 */

export type ClaimKind = "number" | "date" | "entity" | "quoted";
export type Claim = {
  id: string;
  kind: ClaimKind;
  /** Minimal token that triggered the claim, e.g., "2022" */
  token: string;
  /** Readable phrase snippet around the token (for UI & scoring text) */
  text: string;
  /** Character indices inside the original answer */
  start: number;
  end: number;
};

const MONTHS =
  "(January|February|March|April|May|June|July|August|September|October|November|December)";
const YEAR = "(19\\d{2}|20\\d{2})";

const RE_NUMBER = /\b\d+(?:\.\d+)?\b/g;
const RE_YEAR = new RegExp(`\\b${YEAR}\\b`, "g");
const RE_MONTH = new RegExp(`\\b${MONTHS}\\b`, "g");
const RE_QUOTED = /"([^"]{3,80})"|‘([^’]{3,80})’|“([^”]{3,80})”/g;
// simple Proper Noun sequence: e.g., "Lionel Messi", "World Cup"
const RE_ENTITY = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g;

/** id helper */
function id(prefix = "c"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** clamp a range to sentence boundaries and target phrase length */
function expandToPhrase(input: string, from: number, to: number): { start: number; end: number } {
  // 1) find sentence boundaries
  const SENT_END = /[.!?]/g;
  let sStart = 0;
  let sEnd = input.length;

  // look left for previous sentence end
  for (let i = from; i >= 0; i--) {
    if (/[.!?]/.test(input[i])) {
      sStart = i + 1;
      break;
    }
  }
  // look right for next sentence end
  for (let i = to; i < input.length; i++) {
    if (/[.!?]/.test(input[i])) {
      sEnd = i + 1;
      break;
    }
  }

  // 2) grow window around token to ~8–16 words, bounded by sentence
  const slice = input.slice(sStart, sEnd);
  const BEFORE_TARGET = 8;
  const AFTER_TARGET = 8;

  // count words before/after token inside the sentence slice
  const relStart = from - sStart;
  const leftPart = slice.slice(0, relStart);
  const rightPart = slice.slice(relStart);

  function cutByWords(txt: string, words: number, fromRight = true): string {
    const ws = txt.trim().split(/\s+/);
    if (ws.length <= words) return txt;
    return fromRight
      ? ws.slice(ws.length - words).join(" ")
      : ws.slice(0, words).join(" ");
  }

  const leftWin = cutByWords(leftPart, BEFORE_TARGET, true);
  const rightWin = cutByWords(rightPart, AFTER_TARGET, false);

  // rebuild phrase boundaries relative to full input
  const phrase = (leftWin + rightWin).trim();
  const phraseStart = input.indexOf(leftWin.trim(), sStart);
  const phraseEnd = phraseStart + (leftWin + rightWin).length;

  // sanity bounds
  const start = Math.max(0, phraseStart);
  const end = Math.min(input.length, phraseEnd);
  return { start, end };
}

function pushClaim(
  arr: Claim[],
  input: string,
  matchText: string,
  start: number,
  end: number,
  kind: ClaimKind
) {
  if (!matchText) return;

  // Expand to a readable phrase
  const { start: pStart, end: pEnd } = expandToPhrase(input, start, end);
  const phrase = input.slice(pStart, pEnd).trim();

  // De-duplicate by overlapping ranges (favor earlier)
  const overlap = arr.some(
    (c) => !(pEnd <= c.start || pStart >= c.end) && c.kind === kind
  );
  if (overlap) return;

  arr.push({
    id: id("claim"),
    kind,
    token: matchText,
    text: phrase,
    start: pStart,
    end: pEnd,
  });
}

export function extractClaims(input: string): Claim[] {
  const claims: Claim[] = [];
  if (!input || !input.trim()) return claims;

  // quoted titles first (highest confidence)
  for (const m of input.matchAll(RE_QUOTED)) {
    const full = m[0];
    const idx = m.index ?? -1;
    if (idx >= 0) pushClaim(claims, input, full.replace(/^[“"‘]|[”"’]$/g, ""), idx, idx + full.length, "quoted");
  }

  // months / dates
  for (const m of input.matchAll(RE_MONTH)) {
    const full = m[0];
    const idx = m.index ?? -1;
    if (idx >= 0) pushClaim(claims, input, full, idx, idx + full.length, "date");
  }
  for (const m of input.matchAll(RE_YEAR)) {
    const full = m[0];
    const idx = m.index ?? -1;
    if (idx >= 0) pushClaim(claims, input, full, idx, idx + full.length, "number");
  }

  // general numbers (keep short)
  for (const m of input.matchAll(RE_NUMBER)) {
    const full = m[0];
    if (full.length > 4) continue; // likely already caught by year
    const idx = m.index ?? -1;
    if (idx >= 0) pushClaim(claims, input, full, idx, idx + full.length, "number");
  }

  // simple proper-noun entities (skip months already captured)
  for (const m of input.matchAll(RE_ENTITY)) {
    const full = m[0];
    // avoid single capital letters or month duplicates
    if (/^[A-Z]$/.test(full)) continue;
    if (new RegExp(`^${MONTHS}$`).test(full)) continue;
    const idx = m.index ?? -1;
    if (idx >= 0) pushClaim(claims, input, full, idx, idx + full.length, "entity");
  }

  // sort by start
  claims.sort((a, b) => a.start - b.start);
  return claims;
}
