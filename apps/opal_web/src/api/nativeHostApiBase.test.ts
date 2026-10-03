import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  AUTH_API_RESOLVER_VERSION,
  getOpalApiBaseUrl,
  getOpalSocketBaseUrl,
  runtimeConfig,
} from "./productClient";

describe("canonical native API resolver", () => {
  const original = window.location;

  afterEach(() => {
    sessionStorage.clear();
    Object.defineProperty(window, "location", { configurable: true, value: original });
    vi.unstubAllEnvs();
  });

  function stubPage(hostname: string, search = "?opal_native_host=1") {
    sessionStorage.setItem("opal_native_host", "1");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...original,
        hostname,
        host: `${hostname}:5173`,
        href: `http://${hostname}:5173/${search}`,
        search,
        origin: `http://${hostname}:5173`,
        protocol: "http:",
        port: "5173",
      },
    });
  }

  it("AUTH_API_RESOLVER_VERSION is set", () => {
    expect(AUTH_API_RESOLVER_VERSION).toMatch(/native-same-origin-proxy/);
  });

  it("native LAN page + loopback configured API → same-origin (Vite proxy)", () => {
    stubPage("192.168.86.156");
    expect(getOpalApiBaseUrl("http://127.0.0.1:4000")).toBe("http://192.168.86.156:5173");
    expect(getOpalSocketBaseUrl("http://127.0.0.1:4000", "")).toBe(
      "http://192.168.86.156:5173",
    );
  });

  it("does not hardcode a founder LAN address in source", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(resolve(__dirname, "productClient.ts"), "utf8");
    expect(src).not.toMatch(/192\.168\.86\.156/);
  });

  it("desktop localhost page keeps configured loopback API", () => {
    sessionStorage.removeItem("opal_native_host");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...original,
        hostname: "127.0.0.1",
        host: "127.0.0.1:5173",
        href: "http://127.0.0.1:5173/",
        search: "",
        origin: "http://127.0.0.1:5173",
        protocol: "http:",
        port: "5173",
      },
    });
    expect(getOpalApiBaseUrl("http://127.0.0.1:4000")).toBe("http://127.0.0.1:4000");
  });

  it("desktop localhost + LAN-configured API rewrites to loopback (CSP-safe)", () => {
    sessionStorage.removeItem("opal_native_host");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...original,
        hostname: "127.0.0.1",
        host: "127.0.0.1:5173",
        href: "http://127.0.0.1:5173/",
        search: "",
        origin: "http://127.0.0.1:5173",
        protocol: "http:",
        port: "5173",
      },
    });
    expect(getOpalApiBaseUrl("http://192.168.86.156:4000")).toBe("http://127.0.0.1:4000");
  });

  it("native-host loopback page uses same-origin proxy (Playwright CSP-safe)", () => {
    stubPage("127.0.0.1");
    expect(getOpalApiBaseUrl("http://192.168.86.156:4000")).toBe("http://127.0.0.1:5173");
    expect(getOpalApiBaseUrl("http://127.0.0.1:4000")).toBe("http://127.0.0.1:5173");
    expect(getOpalSocketBaseUrl("http://192.168.86.156:4000", "")).toBe(
      "http://127.0.0.1:5173",
    );
  });

  it("secure non-production page uses its own origin for API and socket", () => {
    sessionStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...original,
        hostname: "opal-test.trycloudflare.com",
        host: "opal-test.trycloudflare.com",
        href: "https://opal-test.trycloudflare.com/",
        search: "",
        origin: "https://opal-test.trycloudflare.com",
        protocol: "https:",
        port: "",
      },
    });
    expect(getOpalApiBaseUrl("http://192.168.86.156:5173")).toBe(
      "https://opal-test.trycloudflare.com",
    );
    expect(
      getOpalSocketBaseUrl("http://192.168.86.156:5173", "ws://192.168.86.156:5173"),
    ).toBe("https://opal-test.trycloudflare.com");
  });

  it("never rewrites production HTTPS API on native host", () => {
    stubPage("192.168.1.10");
    expect(getOpalApiBaseUrl("https://api.opal.niovlabs.com")).toBe(
      "https://api.opal.niovlabs.com",
    );
  });

  it("runtimeConfig uses canonical resolver for challenge path", () => {
    stubPage("10.0.0.5");
    const cfg = runtimeConfig();
    // With native LAN + whatever env, must not stay on loopback
    expect(cfg.apiBase).not.toMatch(/127\.0\.0\.1|localhost/);
    expect(cfg.apiBase).toBe("http://10.0.0.5:5173");
  });
});
