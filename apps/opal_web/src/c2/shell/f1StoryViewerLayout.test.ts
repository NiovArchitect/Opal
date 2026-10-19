/**
 * Repair #19 W21 (F1 follow-through) — story viewer media layout
 * pin. Once AuthedImage made record imagery actually load, the
 * viewer well's flex-row layout overflowed: the img (width:100%)
 * plus the caption as a row sibling exceeded the well and the
 * photo spilled past the card edge (proved in the first W21
 * recapture's story-viewer frame). The well must clip, the media
 * must fill it absolutely with object-fit cover, and the caption
 * must overlay — pinned here at the source level.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(resolve(__dirname, "c2shell.css"), "utf8");

function ruleBody(selector: string): string {
  const idx = CSS.indexOf(selector);
  if (idx < 0) return "";
  const open = CSS.indexOf("{", idx);
  const close = CSS.indexOf("}", open);
  return CSS.slice(open + 1, close);
}

describe("F1 story viewer: media fills the well, caption overlays", () => {
  it("the well clips its media", () => {
    const body = ruleBody(".c2s-viewer-media {");
    expect(body).toContain("position: relative");
    expect(body).toContain("overflow: hidden");
  });

  it("img/video fill the well absolutely with cover", () => {
    const body = ruleBody(".c2s-viewer-media video {");
    expect(body).toContain("position: absolute");
    expect(body).toContain("object-fit: cover");
  });

  it("the caption is an overlay, not a flex sibling", () => {
    const body = ruleBody(".c2s-viewer-caption {");
    expect(body).toContain("position: absolute");
    expect(body).toContain("bottom:");
  });
});
