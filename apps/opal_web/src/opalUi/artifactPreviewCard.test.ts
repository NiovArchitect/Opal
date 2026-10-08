import { describe, expect, it } from "vitest";
import { BRAND } from "../brand/brand";
import { artifactPreviewFooter, artifactPreviewStyles } from "./artifactPreviewCard";

describe("artifactPreviewCard", () => {
  it("uses Brand V4 palette tokens", () => {
    const styles = artifactPreviewStyles();
    expect(styles.cyan).toBe(BRAND.palette.opalCyan);
    expect(styles.accent).toBe(BRAND.palette.alignmentGold);
    expect(styles.midnight).toBe(BRAND.palette.midnight);
    expect(artifactPreviewFooter()).toBe("Made with Opal");
  });
});
