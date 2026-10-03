/**
 * DEV runtime provenance — merges Vite build stamps with backend
 * GET /api/dev/runtime-authority. Sets window.__opalRuntimeAuthority.
 */
import { getOpalApiBaseUrl } from "../api/productClient";

declare const __OPAL_GIT_HEAD__: string;
declare const __OPAL_GIT_HEAD_FULL__: string;

export type RuntimeAuthority = {
  frontend_build_sha: string;
  frontend_build_sha_full: string;
  backend_sha: string | null;
  branch: string | null;
  dirty_worktree: boolean | null;
  runtime_diff_fingerprint: string | null;
  schema_version: string | null;
  migration_version: number | string | null;
  server_time: string | null;
  server_timezone: string | null;
  api_base: string;
  fixture_generation_id: string | null;
  client_built_at: string;
  source: "client" | "merged";
};

declare global {
  interface Window {
    __opalRuntimeAuthority?: RuntimeAuthority;
  }
}

function clientStamp(): RuntimeAuthority {
  const short =
    typeof __OPAL_GIT_HEAD__ !== "undefined" ? __OPAL_GIT_HEAD__ : "unknown";
  const full =
    typeof __OPAL_GIT_HEAD_FULL__ !== "undefined" ? __OPAL_GIT_HEAD_FULL__ : short;
  return {
    frontend_build_sha: short,
    frontend_build_sha_full: full,
    backend_sha: null,
    branch: null,
    dirty_worktree: null,
    runtime_diff_fingerprint: null,
    schema_version: null,
    migration_version: null,
    server_time: null,
    server_timezone: null,
    api_base: getOpalApiBaseUrl(),
    fixture_generation_id: null,
    client_built_at: new Date().toISOString(),
    source: "client",
  };
}

export function readRuntimeAuthority(): RuntimeAuthority | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__opalRuntimeAuthority;
}

/** Boot: stamp client SHA immediately, then merge server provenance when reachable. */
export function installRuntimeAuthority(): RuntimeAuthority {
  const base = clientStamp();
  if (typeof window !== "undefined") {
    window.__opalRuntimeAuthority = base;
    try {
      document.documentElement.setAttribute("data-opal-frontend-sha", base.frontend_build_sha);
    } catch {
      /* ignore */
    }
  }
  void fetchAndMerge(base);
  return base;
}

async function fetchAndMerge(base: RuntimeAuthority): Promise<void> {
  try {
    const apiBase = getOpalApiBaseUrl() || (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${apiBase.replace(/\/$/, "")}/api/dev/runtime-authority`;
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return;
    const body = (await res.json()) as Record<string, unknown>;
    const merged: RuntimeAuthority = {
      ...base,
      frontend_build_sha: base.frontend_build_sha,
      frontend_build_sha_full: base.frontend_build_sha_full,
      backend_sha: str(body.backend_sha) || base.backend_sha,
      branch: str(body.branch) || base.branch,
      dirty_worktree:
        typeof body.dirty_worktree === "boolean" ? body.dirty_worktree : base.dirty_worktree,
      runtime_diff_fingerprint:
        str(body.runtime_diff_fingerprint) || base.runtime_diff_fingerprint,
      schema_version: str(body.schema_version) || base.schema_version,
      migration_version:
        (typeof body.migration_version === "number" || typeof body.migration_version === "string"
          ? body.migration_version
          : null) ?? base.migration_version,
      server_time: str(body.server_time) || base.server_time,
      server_timezone: str(body.server_timezone) || base.server_timezone,
      api_base: str(body.api_base) || base.api_base || apiBase,
      fixture_generation_id: str(body.fixture_generation_id) || base.fixture_generation_id,
      source: "merged",
    };
    if (typeof window !== "undefined") {
      window.__opalRuntimeAuthority = merged;
      try {
        document.documentElement.setAttribute(
          "data-opal-backend-sha",
          merged.backend_sha || "unknown",
        );
        if (merged.dirty_worktree != null) {
          document.documentElement.setAttribute(
            "data-opal-dirty-worktree",
            merged.dirty_worktree ? "1" : "0",
          );
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* server unreachable — client stamp remains */
  }
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
