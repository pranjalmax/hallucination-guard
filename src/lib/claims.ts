// src/lib/claims.ts

export type Claim = {
  id: string;
  text: string;
  start: number; // start index in the original answer
  end: number;   // end index (exclusive)
  tags: string[]; // e.g., ["number"], ["date"], ["entity"], ["quoted"]
};

/** simple id helper */
function cid(prefix = "c") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** very light sentence splitter (ok for our use) */
export function splitSentences(input: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  let i = 0;
  let cursor = 0;
  const s = input.replace(/\r\n/g, "\n");

  while (i < s.length) {
    const ch = s[i];
    if (/[.!?]/.test(ch)) {
      // include following spaces
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      const sent = s.slice(cursor, j).trim();
      if (sent) out.push({ text: sent, start: cursor, end: j });
      cursor = j;
      i = j;
    } else {
      i++;
    }
  }
  if (cursor < s.length) {
    const last = s.slice(cursor).trim();
    if (last) out.push({ text: last, start: cursor, end: s.length });
  }
  return out;
}

/**
 * Heuristic claim mining:
 * - numbers/percentages/currency
 * - years and Month names
 * - quoted titles
 * - capitalized multi-word entities (2-5 words)
 * - fallback: declarative sentences containing copulas ("is/are/was/were/has/have")
 */
export function extractClaims(answer: string, maxClaims = 50): Claim[] {
  const claims: Claim[] = [];
  const seen = new Set<string>();
  const pushClaim = (text: string, start: number, end: number, tags: string[]) => {
    const key = text.toLowerCase().slice(0, 200);
    if (seen.has(key)) return;
    seen.add(key);
    claims.push({ id: cid("claim"), text: text.trim(), start, end, tags });
  };

  const sentences = splitSentences(answer);

  const numberRe =
    /\b(?:\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)(?:\s?%|k|m|b)?\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion)\b/gi;

  const yearRe = /\b(19|20)\d{2}\b/g;
  const monthRe =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/gi;

  const quotedRe = /"([^"]{5,120})"|'([^']{5,120})'/g;

  const properNounRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/g;

  for (const sent of sentences) {
    const baseStart = sent.start;

    // 1) quoted titles
    for (const m of sent.text.matchAll(quotedRe)) {
      const txt = (m[1] || m[2] || "").trim();
      if (!txt) continue;
      const local = sent.text.indexOf(txt, m.index ?? 0);
      const start = baseStart + local;
      const end = start + txt.length;
      pushClaim(txt, start, end, ["quoted"]);
    }

    // 2) numbers / percentages / currency
    for (const m of sent.text.matchAll(numberRe)) {
      const txt = m[0];
      const start = baseStart + (m.index ?? 0);
      const end = start + txt.length;
      pushClaim(txt, start, end, ["number"]);
    }

    // 3) dates (years / months)
    for (const m of sent.text.matchAll(yearRe)) {
      const txt = m[0];
      const start = baseStart + (m.index ?? 0);
      pushClaim(txt, start, start + txt.length, ["date"]);
    }
    for (const m of sent.text.matchAll(monthRe)) {
      const txt = m[0];
      const start = baseStart + (m.index ?? 0);
      pushClaim(txt, start, start + txt.length, ["date"]);
    }

    // 4) capitalized multi-word entities (skip at sentence very start if it's just the first word)
    for (const m of sent.text.matchAll(properNounRe)) {
      const txt = m[0];
      // avoid grabbing short starts like "This Work"
      if (txt.split(/\s+/).length < 2) continue;
      const start = baseStart + (m.index ?? 0);
      pushClaim(txt, start, start + txt.length, ["entity"]);
    }

    // 5) fallback: sentence-level claims if it looks declarative & not too long
    const looksDeclarative =
      /\b(is|are|was|were|has|have|shows?|reports?|states?|confirms?)\b/i.test(sent.text);
    if (looksDeclarative && sent.text.length >= 40 && sent.text.length <= 280) {
      pushClaim(sent.text, sent.start, sent.end, ["sentence"]);
    }

    if (claims.length >= maxClaims) break;
  }

  // keep short, de-duplicate already done; sort by start
  claims.sort((a, b) => a.start - b.start);
  return claims.slice(0, maxClaims);
}
