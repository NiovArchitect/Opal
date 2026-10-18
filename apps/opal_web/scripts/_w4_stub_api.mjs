/**
 * Repair #18 / Walk #4 - LOCAL rendered-proof stub (NOT a product path).
 * Serves contract-shaped product API responses on 127.0.0.1:4000 so the
 * real web client can be rendered and hit-tested locally without the
 * Phoenix stack. It proves nothing about backend behavior.
 */
import http from "node:http";
const user = { id: "u-w4-founder", display_name: "Sadeil", handle: "sadeil" };
const peer = (id, name) => ({ id, display_name: name, handle: name.toLowerCase().replace(/\s+/g, "") });
const planProjection = {
  lineage_id: "plan-juniper-1", conversation_id: "conv-chanelle", visibility: "participants",
  participant_mode: "dyad", kicker: "NEXT TOGETHER", when_label: "Saturday · 7:30 PM",
  place: "Juniper & Ivy", activity: "Dinner", timezone: "America/Los_Angeles",
  execution_label: "Ready · leave 6:55", going_count: 3, interested_count: 0, total_count: 4,
  viewer_state: "accepted", pending_change: false, conflict: null,
};
const convs = [
  { id: "conv-chanelle", title: "Chanelle", preview: "Perfect. I'll grab a table.", updated_at: "2026-10-17T20:00:00Z", peers: [peer("u-chanelle", "Chanelle")], member_count: 2, composition: "dyad", unread_count: 0, plan_projection: planProjection },
  { id: "conv-maya", title: "Maya", preview: "I'm free after 10", updated_at: "2026-10-17T19:00:00Z", peers: [peer("u-maya", "Maya")], member_count: 2, composition: "dyad", unread_count: 2, plan_projection: null },
  { id: "conv-juniper-crew", title: "Juniper crew", preview: "I can make 7:30", updated_at: "2026-10-17T18:00:00Z", peers: [peer("u-chanelle", "Chanelle"), peer("u-maya", "Maya"), peer("u-jordan", "Jordan")], member_count: 4, composition: "group", unread_count: 1, plan_projection: { ...planProjection, conversation_id: "conv-juniper-crew", participant_mode: "group" } },
  { id: "conv-sabrina", title: "Sabrina", preview: "Sent a photo", updated_at: "2026-10-17T17:00:00Z", peers: [peer("u-sabrina", "Sabrina")], member_count: 2, composition: "dyad", unread_count: 3, plan_projection: null },
  { id: "conv-alex", title: "Alex", preview: "Mexico City was unreal", updated_at: "2026-10-16T17:00:00Z", peers: [peer("u-alex", "Alex")], member_count: 2, composition: "dyad", unread_count: 0, plan_projection: null },
];
const msgs = (cid) => ([
  { id: "m1", body: "Dinner Saturday at Juniper & Ivy?", sender_user_id: "u-chanelle", server_seq: 1, created_at: "2026-10-17T19:58:00Z", client_message_id: "c1", conversation_id: cid },
  { id: "m2", body: "Yes! 7:30 works for me.", sender_user_id: "u-w4-founder", server_seq: 2, created_at: "2026-10-17T19:59:00Z", client_message_id: "c2", conversation_id: cid },
  { id: "m3", body: "Perfect. I'll grab a table.", sender_user_id: "u-chanelle", server_seq: 3, created_at: "2026-10-17T20:00:00Z", client_message_id: "c3", conversation_id: cid },
  { id: "m4", body: "Can't wait. See you there.", sender_user_id: "u-w4-founder", server_seq: 4, created_at: "2026-10-17T20:01:00Z", client_message_id: "c4", conversation_id: cid },
]);
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, x-csrf-token");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const json = (obj, code = 200) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
  let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    if (p === "/api/v1/product/session") return json({ user, session: { id: "sess-w4" }, auth_mode: "bearer" });
    if (p === "/api/v1/product/conversations" && req.method === "GET") return json({ conversations: convs, signals: [] });
    const mm = p.match(/^\/api\/v1\/product\/conversations\/([^/]+)\/messages$/);
    if (mm && req.method === "GET") return json({ messages: msgs(mm[1]), signals: [] });
    if (mm && req.method === "POST") { try { const b = JSON.parse(body || "{}"); return json({ message: { id: "m" + Date.now(), body: b.body || "", sender_user_id: user.id, server_seq: 99, created_at: new Date().toISOString(), client_message_id: b.client_message_id || "cx", conversation_id: mm[1] }, signals: [] }); } catch { return json({}); } }
    const am = p.match(/^\/api\/v1\/product\/conversations\/([^/]+)\/alignment$/);
    if (am && req.method === "GET") return json({ alignment: { plan_id: "plan-juniper-1", place: "Juniper & Ivy", when_label: "Saturday · 7:30 PM", activity: "Dinner", status: "ready" } });
    if (p.includes("/plans") && req.method === "GET") return json({ plans: [] });
    if (p.includes("invitations") && req.method === "GET") return json({ invitations: [] });
    if (p.includes("founder-communication-seed") || p.includes("founder-graph-commitment-seed")) return json({ seeded: false, conversations: [] });
    if (p.includes("/preferences/messaging")) return json({ read_receipts_enabled: true, message_notifications_enabled: true });
    if (p.includes("/attention")) return json({ items: [], count: 0 });
    if (p.includes("/stories")) return json({ stories: [] });
    return json({});
  });
});
server.listen(4000, "127.0.0.1", () => console.log("stub api on 4000"));
