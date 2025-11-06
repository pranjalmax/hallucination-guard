// src/lib/scoring.ts

/**
 * Evidence scoring heuristics.
 *
 * We label each (claim, evidenceChunk) as:
 * - "supported"        : good lexical overlap, no conflicting dates.
 * - "contradiction"    : same context but dates/years clearly disagree.
 * - "unknown"          : everything else.
 *
 * This is intentionally simple and conservative.
 */

export type EvidenceLabel = "supported" | "contradiction" | "unknown";

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const MONTH_RE = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi;
const YEAR_RE = /\b(19\d{2}|20\d{2})\b/g;

// small stopword list — enough for our use
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "for",
  "to",
  "at",
  "by",
  "with",
  "from",
  "this",
  "that",
  "it",
  "is",
  "was",
  "were",
  "are",
  "be",
  "as",
  "not",
  "no",
  "did",
  "does",
  "have",
  "has",
  "had",
  "later",
  "first",
  "will",
  "would",
  "can",
  "could",
  "should",
]);

type Dates = {
  months: string[];
  years: string[];
};

function normalizeTokens(text: string): string[] {
  const out: string[] = [];
  const lower = text.toLowerCase();
  const re = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower))) {
    const tok = m[0];
    if (STOPWORDS.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

function extractDates(text: string): Dates {
  const months: string[] = [];
  const years: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = MONTH_RE.exec(text))) {
    const month = (m[1] || m[0]).toLowerCase();
    if (MONTH_NAMES.includes(month)) months.push(month);
  }
  MONTH_RE.lastIndex = 0;

  while ((m = YEAR_RE.exec(text))) {
    years.push(m[1]);
  }
  YEAR_RE.lastIndex = 0;

  return { months, years };
}

function hasDateContradiction(claim: string, evidence: string): boolean {
  const c = extractDates(claim);
  const e = extractDates(evidence);

  const claimHas = c.months.length || c.years.length;
  const evHas = e.months.length || e.years.length;

  if (!claimHas || !evHas) return false;

  const claimTokens = normalizeTokens(claim);
  const evTokens = normalizeTokens(evidence);
  const evSet = new Set(evTokens);
  const sharedContext = claimTokens.filter((t) => evSet.has(t));

  // need some shared non-trivial context
  if (sharedContext.length < 2) return false;

  if (c.months.length && e.months.length) {
    const commonMonths = c.months.filter((m) => e.months.includes(m));
    if (commonMonths.length === 0) return true;
  }

  if (c.years.length && e.years.length) {
    const commonYears = c.years.filter((y) => e.years.includes(y));
    if (commonYears.length === 0) return true;
  }

  return false;
}

/**
 * Score a single evidence chunk for a claim.
 * Returns label + lexical overlap (0..1).
 */
export function scoreEvidence(
  claim: string,
  evidence: string
): { label: EvidenceLabel; overlap: number } {
  const claimTokens = normalizeTokens(claim);
  const evTokens = normalizeTokens(evidence);

  if (!claimTokens.length || !evTokens.length) {
    return { label: "unknown", overlap: 0 };
  }

  const evSet = new Set(evTokens);
  let common = 0;
  for (const t of claimTokens) {
    if (evSet.has(t)) common += 1;
  }
  const overlap = common / claimTokens.length; // 0..1

  // strong date conflict with enough context → contradiction
  if (hasDateContradiction(claim, evidence) && overlap >= 0.25) {
    return { label: "contradiction", overlap };
  }

  // strong lexical support, no contradiction
  if (overlap >= 0.6) {
    return { label: "supported", overlap };
  }

  // medium overlap: require dates (if present) to align
  if (overlap >= 0.4) {
    const c = extractDates(claim);
    const e = extractDates(evidence);

    const monthsOk =
      !c.months.length ||
      !e.months.length ||
      c.months.some((m) => e.months.includes(m));
    const yearsOk =
      !c.years.length ||
      !e.years.length ||
      c.years.some((y) => e.years.includes(y));

    if (monthsOk && yearsOk) {
      return { label: "supported", overlap };
    }
  }

  return { label: "unknown", overlap };
}
