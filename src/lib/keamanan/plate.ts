// Indonesian plate: 1-2 letter region, 1-4 digits, 0-3 letter suffix (e.g. "B 1234 ABC").
const PLATE_RE = /([A-Z]{1,2})\s?(\d{1,4})\s?([A-Z]{0,3})\b/g;

const DIGIT_FIX: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6" };

export function normalizePlate(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = compact.match(/^([A-Z]{1,2})([0-9OQDILZSBG]{1,4})([A-Z]{0,3})$/);
  if (!m) return raw.toUpperCase().replace(/\s+/g, " ").trim();
  const digits = m[2].replace(/[OQDILZSBG]/g, (c) => DIGIT_FIX[c] ?? c);
  return [m[1], digits, m[3]].filter(Boolean).join(" ");
}

export function plateKey(plate?: string) {
  return (plate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function extractPlates(lines: string[]): string[] {
  const found = new Set<string>();
  const texts = [...lines, lines.join(" ")];
  for (const text of texts) {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9 ]/g, " ");
    for (const m of cleaned.matchAll(PLATE_RE)) {
      // Plates have a digit block; skip pure-letter noise like "INDONESIA".
      if (!m[2]) continue;
      found.add([m[1], m[2], m[3]].filter(Boolean).join(" "));
    }
  }
  return Array.from(found).sort((a, b) => b.length - a.length);
}
