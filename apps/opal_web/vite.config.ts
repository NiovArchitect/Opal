import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const CONFIG_DIR = fileURLToPath(new URL(".", import.meta.url));

/** Exact source HEAD for the Vite process — stamps DOM; must match founder runtime= */
function readGitHeadShort(): string {
  try {
    return execSync("git rev-parse --short=7 HEAD", {
      cwd: CONFIG_DIR,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function readGitHeadFull(): string {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: CONFIG_DIR,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

const OPAL_GIT_HEAD = readGitHeadShort();
const OPAL_GIT_HEAD_FULL = readGitHeadFull();

export default defineConfig({
  plugins: [react()],
  define: {
    __OPAL_GIT_HEAD__: JSON.stringify(OPAL_GIT_HEAD),
    __OPAL_GIT_HEAD_FULL__: JSON.stringify(OPAL_GIT_HEAD_FULL),
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
