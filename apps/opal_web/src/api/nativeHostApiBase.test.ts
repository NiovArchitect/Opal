import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { runtimeConfig } from "./productClient";

describe("native host API base rewrite", () => {
  const original = window.location;

  beforeEach(() => {
    sessionStorage.setItem("opal_native_host", "1");
    // jsdom location is usually localhost — simulate LAN page host via stub
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...original,
        hostname: "192.168.86.156",
        host: "192.168.86.156:5173",
        href: "http://192.168.86.156:5173/?opal_native_host=1",
        search: "?opal_native_host=1",
        origin: "http://192.168.86.156:5173",
      },
    });
  });

  afterEach(() => {
    sessionStorage.removeItem("opal_native_host");
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });

  it("rewrites localhost API to page LAN hostname on native host", () => {
    const { apiBase } = runtimeConfig();
    // env may already be LAN; accept either rewrite target or configured LAN
    expect(apiBase.includes("192.168.86.156") || apiBase.includes("127.0.0.1")).toBe(true);
    if (apiBase.includes("127.0.0.1")) {
      // Should not stay on loopback when native + LAN hostname
      expect(apiBase).toMatch(/192\.168\.86\.156/);
    }
  });
});
