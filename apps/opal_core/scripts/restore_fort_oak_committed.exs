# Restore Fort Oak Walk A/B as a real committed lifecycle (dev only).
# Not "seed until green" — writes explicit propose/accept actions onto one lineage.
#
#   cd apps/opal_core && mix run scripts/restore_fort_oak_committed.exs
#
# Lifecycle written:
#   activity lock (A) → exact time lock (A) → place propose (A) → place confirm (B)
# Then sync_conversation so commitment becomes aligned with plan_lines.
# Duplicate active SharedPlans are reconciled first (STATE OWNERSHIP LAW).

if Mix.env() != :dev do
  IO.puts("REFUSED: development-only restore.")
  System.halt(1)
end

alias OpalCore.Repo
alias OpalCore.SocialFlow.{ConversationAlignment, SharedPlan}

conversation_id = "ace99adc-db67-4258-9d95-f612246c6c84"
walk_a = "47aa5856-8c56-4b18-a4d4-6a9b456516a8"
walk_b = "b599fcd7-7a97-4736-8221-86e0a6d8dc7a"

{:ok, reconcile} = ConversationAlignment.reconcile_conversation_plans(conversation_id)
IO.inspect(reconcile, label: "RECONCILE")

plan = ConversationAlignment.active_plan_for_conversation(conversation_id)

unless plan do
  IO.puts("NO_ACTIVE_PLAN — refusing to invent a SharedPlan from thin air")
  System.halt(1)
end

now = DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()

action = fn kind, actor, value, truth ->
  %{
    "kind" => kind,
    "actor_user_id" => actor,
    "value" => value,
    "truth" => truth,
    "explicit" => true,
    "schema_version" => 1,
    "at" => now
  }
end

# Lifecycle: proposal → acceptance → committed plan (place + time locked).
# Time starts at 7:00 PM so A8 can propose 7:30 then 8:00 as change proposals.
explicit_actions = [
  action.("activity_lock", walk_a, "dinner", "user_stated"),
  action.("exact_time_lock", walk_a, "7:00 PM", "locked"),
  action.("place_propose", walk_a, "Fort Oak", "proposed"),
  action.("place_confirm", walk_b, "Fort Oak", "agreed")
]

alignment =
  (plan.alignment || %{})
  |> Map.put("lineage_id", plan.id)
  |> Map.put("plan_version", max(1, plan.alignment["plan_version"] || 0))
  |> Map.put("plan_timezone", "America/Los_Angeles")
  |> Map.put("explicit_actions", explicit_actions)
  |> Map.put("restore_reason", "steward_pass1_committed_lifecycle")
  |> Map.put("restored_at", now)

{:ok, _} =
  plan
  |> SharedPlan.changeset(%{
    title: "Fort Oak",
    status: "agreed",
    location: "Fort Oak",
    time_label: "7:00 PM",
    timezone: "America/Los_Angeles",
    alignment: alignment,
    cancelled_at: nil
  })
  |> Repo.update()

state = ConversationAlignment.sync_conversation(conversation_id)

IO.puts("RESTORED plan=#{plan.id}")
IO.puts("commitment=#{inspect(state["commitment"])}")
IO.puts("plan_lines=#{inspect(state["plan_lines"])}")
IO.puts("exact_time=#{inspect(get_in(state, ["exact_time", "value"]))} place=#{inspect(get_in(state, ["place", "value"]))}")

unless state["commitment"] in ["aligned", "execution_ready"] do
  IO.puts("WARN: commitment not aligned after restore — inspect fold/actions")
  System.halt(2)
end
