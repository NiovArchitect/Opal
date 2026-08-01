import type { SqlDriver } from "../storage/sqlDriver";
import type {
  PrivateReminderLocal,
  SharedPlanLocal,
  SocialFlowSignal,
} from "./types";

export const SOCIAL_FLOW_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sf_signals (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  copy TEXT NOT NULL,
  visibility TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  audience_user_id TEXT,
  proposal_id TEXT,
  plan_id TEXT,
  commitment_id TEXT,
  reminder_id TEXT,
  revision_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sf_plans (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  time_label TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sf_reminders (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT,
  owner_user_id TEXT NOT NULL,
  visibility TEXT NOT NULL,
  content_summary TEXT NOT NULL,
  status TEXT NOT NULL
);
`;

/**
 * Local projection of Social Flow state.
 * Private reminders are stored only for the owning user on this device.
 */
export class SocialFlowRepository {
  constructor(private readonly db: SqlDriver) {}

  migrate(): void {
    for (const stmt of SOCIAL_FLOW_SCHEMA_SQL.split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      this.db.exec(stmt);
    }
  }

  upsertSignal(signal: SocialFlowSignal): void {
    this.db.run(
      `INSERT INTO sf_signals (
        id, conversation_id, kind, status, copy, visibility, actions_json,
        audience_user_id, proposal_id, plan_id, commitment_id, reminder_id, revision_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        signal.id,
        signal.conversationId,
        signal.kind,
        signal.status,
        signal.copy,
        signal.visibility,
        JSON.stringify(signal.actions || []),
        signal.audienceUserId ?? null,
        signal.proposalId ?? null,
        signal.planId ?? null,
        signal.commitmentId ?? null,
        signal.reminderId ?? null,
        signal.revisionId ?? null,
        signal.createdAt,
      ],
    );
  }

  listSignals(conversationId: string, viewerUserId: string): SocialFlowSignal[] {
    const rows = this.db.all(
      `SELECT * FROM sf_signals WHERE conversation_id = ? ORDER BY created_at DESC`,
      [conversationId],
    );
    return rows
      .map(rowToSignal)
      .filter(
        (s) =>
          s.visibility === "shared" ||
          s.audienceUserId === viewerUserId ||
          s.audienceUserId == null,
      );
  }

  upsertPlan(plan: SharedPlanLocal): void {
    this.db.run(
      `INSERT INTO sf_plans (id, conversation_id, title, status, time_label, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        plan.id,
        plan.conversationId,
        plan.title,
        plan.status,
        plan.timeLabel ?? null,
        plan.createdAt,
      ],
    );
  }

  listPlans(conversationId: string): SharedPlanLocal[] {
    return this.db
      .all(`SELECT * FROM sf_plans WHERE conversation_id = ?`, [conversationId])
      .map((r) => ({
        id: String(r.id),
        conversationId: String(r.conversation_id),
        title: String(r.title),
        status: String(r.status),
        timeLabel: r.time_label == null ? null : String(r.time_label),
        createdAt: String(r.created_at),
      }));
  }

  upsertReminder(reminder: PrivateReminderLocal, viewerUserId: string): void {
    // Never persist another user's private reminder on this device.
    if (reminder.visibility === "private" && reminder.ownerUserId !== viewerUserId) {
      return;
    }
    this.db.run(
      `INSERT INTO sf_reminders (id, plan_id, owner_user_id, visibility, content_summary, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        reminder.id,
        reminder.planId ?? null,
        reminder.ownerUserId,
        reminder.visibility,
        reminder.contentSummary,
        reminder.status,
      ],
    );
  }

  listReminders(viewerUserId: string): PrivateReminderLocal[] {
    return this.db
      .all(`SELECT * FROM sf_reminders WHERE owner_user_id = ? OR visibility = 'shared'`, [
        viewerUserId,
      ])
      .map((r) => ({
        id: String(r.id),
        planId: r.plan_id == null ? null : String(r.plan_id),
        ownerUserId: String(r.owner_user_id),
        visibility: String(r.visibility) as "private" | "shared",
        contentSummary: String(r.content_summary),
        status: String(r.status),
      }))
      .filter((r) => r.visibility === "shared" || r.ownerUserId === viewerUserId);
  }
}

function rowToSignal(r: Record<string, unknown>): SocialFlowSignal {
  let actions: { id: string; label: string }[] = [];
  try {
    actions = JSON.parse(String(r.actions_json || "[]"));
  } catch {
    actions = [];
  }
  return {
    id: String(r.id),
    conversationId: String(r.conversation_id),
    kind: String(r.kind) as SocialFlowSignal["kind"],
    status: String(r.status),
    copy: String(r.copy),
    visibility: String(r.visibility) as "private" | "shared",
    actions,
    audienceUserId: r.audience_user_id == null ? null : String(r.audience_user_id),
    proposalId: r.proposal_id == null ? null : String(r.proposal_id),
    planId: r.plan_id == null ? null : String(r.plan_id),
    commitmentId: r.commitment_id == null ? null : String(r.commitment_id),
    reminderId: r.reminder_id == null ? null : String(r.reminder_id),
    revisionId: r.revision_id == null ? null : String(r.revision_id),
    createdAt: String(r.created_at),
  };
}
