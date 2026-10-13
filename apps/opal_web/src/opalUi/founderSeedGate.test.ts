import { describe, expect, it } from "vitest";
import {
  isPrivateLanHost,
  resolveFounderSeedGate,
} from "./founderGraphSeed";

describe("REALITY SOURCE PRIORITY — founder seed gate (Pass 1D)", () => {
  it("recognizes private LAN hosts", () => {
    expect(isPrivateLanHost("192.168.1.20")).toBe(true);
    expect(isPrivateLanHost("10.0.0.5")).toBe(true);
    expect(isPrivateLanHost("localhost")).toBe(true);
    expect(isPrivateLanHost("opal.niovlabs.com")).toBe(false);
    expect(isPrivateLanHost("api.opal.niovlabs.com")).toBe(false);
  });

  it("production build defaults to empty reality (no founder universe)", () => {
    const r = resolveFounderSeedGate({
      productionBuild: true,
      sessionOptIn: true,
      localOptIn: true,
      nativeHost: true,
      hostname: "192.168.1.20",
      envSeed: "true",
      urlHolyShit: "1",
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe("production_default");
  });

  it("production build allows only explicit lab URL seed=1", () => {
    const r = resolveFounderSeedGate({
      productionBuild: true,
      urlSeed: "1",
      localOptIn: false,
    });
    expect(r.enabled).toBe(true);
    expect(r.reason).toBe("url:opal_founder_seed=1");
  });

  it("url seed=0 wins over every higher-looking opt-in", () => {
    const r = resolveFounderSeedGate({
      urlSeed: "0",
      productionBuild: false,
      sessionOptIn: true,
      localOptIn: true,
      nativeHost: true,
      hostname: "127.0.0.1",
      envSeed: "1",
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe("url:opal_founder_seed=0");
  });

  it("dev native_host+lan still enables for founder walks", () => {
    const r = resolveFounderSeedGate({
      productionBuild: false,
      nativeHost: true,
      hostname: "192.168.0.42",
    });
    expect(r.enabled).toBe(true);
    expect(r.reason).toBe("native_host+lan");
  });

  it("dev default with no opt-in is empty", () => {
    const r = resolveFounderSeedGate({ productionBuild: false });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe("default");
  });
});
