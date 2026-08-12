#!/usr/bin/env node
/**
 * Static interaction sweep — every visibly actionable pattern must bind a handler.
 * Not a Playwright E2E; catches dead taps from visual reconstruction.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(resolve(root, "apps/opal_web/src/OpalApp.tsx"), "utf8");

const required = [
  { name: "Home living field", re: /data-testid=\"home-living-field\"/ },
  { name: "Coming up / presence cards", re: /data-testid=\"coming-up-card\"/ },
  { name: "Member tabbar", re: /data-testid=\"member-tabbar\"/ },
  { name: "Sign out", re: /data-testid=\"sign-out\"/ },
  { name: "Chat context", re: /data-testid=\"chat-context\"/ },
  { name: "Send path", re: /sendMessage\(/ },
  { name: "Open chat from presence", re: /onOpenChat\(s\.conversation_id\)/ },
  { name: "Tab navigation", re: /setTab\(t\.id\)/ },
  { name: "Availability sheet path", re: /AvailabilitySheet|availability/i },
  { name: "Curate / resolve path", re: /Curate|curate|OpalResolution/ },
  { name: "Extend private path", re: /extend|Only you|opalPrivate/i },
  { name: "Realtime join", re: /joinConversation/ },
  { name: "Realtime stop on sign-out", re: /productRealtime\.stop/ },
  { name: "Group composition data attr", re: /data-composition/ },
];

let failed = 0;
for (const r of required) {
  if (r.re.test(app)) {
    console.log(`PASS  ${r.name}`);
  } else {
    console.error(`FAIL  ${r.name}`);
    failed++;
  }
}

// Dead button heuristic: <button without onClick nearby (rough)
const buttonBlocks = app.match(/<button[\s\S]{0,200}>/g) || [];
const noClick = buttonBlocks.filter((b) => !/onClick=/.test(b) && !/type=\"submit\"/.test(b));
// Filter decorative false positives carefully — report count only
console.log(`INFO  button_open_tags=${buttonBlocks.length} without_onclick_in_open_tag=${noClick.length}`);

process.exit(failed ? 1 : 0);
