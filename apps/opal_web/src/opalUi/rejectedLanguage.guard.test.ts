/**
 * Pass 29 Correction — durable rejected founder-copy guard.
 * Fails if commercial/philosophy phrases reappear in LIVE product sources.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = resolve(root, "src");

/** Live product surface only — not evidence docs or historical evidence JSON. */
const REJECTED = [
  /Make this mine/i,
  /Make this yours/i,
  /Their experience becomes your possibility/i,
  /Logistics recompose for you/i,
  /experience portability/i,
  /recompose for you/i,
  /began as .*(Moment|moment)/i,
  // Schema labels as visible product copy on forming path
  /["'`]FORMING["'`]/,
  /["'`]WHERE["'`]/,
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|css)$/.test(name) && !name.includes("rejectedLanguage.guard")) {
      // Allow the guard file itself and pure test descriptions that only assert absence
      acc.push(p);
    }
  }
  return acc;
}

describe("rejected founder language (live product)", () => {
  it("does not ship Make this mine/yours or internal philosophy in product UI sources", () => {
    const files = walk(srcRoot);
    const hits: Array<{ file: string; line: string; phrase: string }> = [];
    for (const file of files) {
      // Skip pure unit tests that only mention phrases as rejected examples
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
        const text = readFileSync(file, "utf8");
        // Tests may assert equality to allowed CTAs only — still ban rejected strings in expected UI copy
        const lines = text.split("\n");
        lines.forEach((line, i) => {
          // allow comments that document rejection
          if (/REJECTED|rejected|do not|must not|ban/i.test(line)) return;
          for (const re of REJECTED) {
            if (re.test(line) && /toBe\(|label:|cta:|title>|kicker|children/.test(line)) {
              hits.push({ file, line: `${i + 1}: ${line.trim()}`, phrase: re.source });
            }
          }
        });
        continue;
      }
      const text = readFileSync(file, "utf8");
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        if (line.trim().startsWith("*") || line.trim().startsWith("//") || line.trim().startsWith("/*")) {
          // comments may document rejection — skip pure comment lines
          if (!/["'`]/.test(line)) return;
        }
        for (const re of REJECTED) {
          if (re.test(line)) {
            // allow type unions listing historical kinds if marked SUPERSEDED
            if (/SUPERSEDED|REJECTED|do not ship/i.test(line)) return;
            hits.push({ file, line: `${i + 1}: ${line.trim()}`, phrase: re.source });
          }
        }
      });
    }
    expect(hits, JSON.stringify(hits, null, 2)).toEqual([]);
  });
});
