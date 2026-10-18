defmodule OpalCore.Intelligence.ProactiveConversation do
  @moduledoc """
  Proactive thread initiation (Paste C Phase 3).

  PRODUCT LAW (founder-tunable flags marked below — do not loosen without approval):
  - Closed trigger list only: temporal_anchor_3d | presence_open_loop | routine_streak_broken | checkin_sweep | solo_check_in
    (checkin_sweep added by Repair #18 B3 - outbound sweep suggestion only,
    see SocialFlow.CheckinSuggestion. solo_check_in added by Repair #18
    Division B track B5b as a named law change: one new trigger, cadence
    carried by its caller, riding this module's gate stack unchanged)
  - Max 1 proactive thread per account per day (founder-tunable)
  - Owner must have messaged Opal in last 7 days (never cold-start)
  - Quiet hours: never before 8am or after 10pm owner timezone (default America/Los_Angeles)
  - Permanent opt-out via proactive_opt_out on users
  - Opening message always carries reason first

  Delivery: Opal Center 1:1 via OpalConversations (Opal is not a social group participant).
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Intelligence.{AttentionBudget, LlmAdapter, LlmRespond}
  alias OpalCore.SocialFlow.{Clock, PlanStateArbitration, SharedPlan}
  alias OpalCore.SocialMemory.ProactiveThreadLog

  # founder-tunable
  @max_per_day 1
  @quiet_start 8
  @quiet_end 22
  @default_tz "America/Los_Angeles"

  @allowed_triggers ~w(temporal_anchor_3d presence_open_loop routine_streak_broken checkin_sweep solo_check_in)

  def allowed_triggers, do: @allowed_triggers

  # --- Repair #16 (W4, P1) — consent-gated temporal-anchor caller -----------
  #
  # `maybe_initiate/5` had zero production callers because wiring one
  # creates NEW OUTBOUND CONTACT. Consent investigation (Repair #16):
  # no existing setting covers Opal starting a thread. The act-on-behalf
  # capabilities (calls_outbound / bookings_reserve / messaging_business)
  # govern acting on businesses/providers, not opening personal threads;
  # `proactive_opt_out` is an opt-out layered on initiation law, not an
  # opt-in. The caller below is therefore gated on the additive
  # `users.proactive_threads_enabled` setting (migration
  # 20261025010001, default FALSE — no behavior change for any account
  # until the user enables it), and `proactive_opt_out` still suppresses
  # even when the opt-in is on. Everything else — closed trigger list,
  # 1/day cap, quiet hours, 7-day activity gate, AttentionBudget — is
  # enforced by `maybe_initiate/5` itself, unchanged.
  #
  # The single wired trigger is the safest one: `temporal_anchor_3d`
  # for a plan the account owner already made/confirmed, fired from
  # `PlanCompletion.drive/3`. One initiation per plan, ever: the
  # per-plan check below runs before the daily-cap check inside
  # `maybe_initiate/5`, so re-driving a plan can never re-open a thread
  # about it on a later day.

  # "About 3 days before the plan" — the anchor band. A drive outside
  # the band does not fire; a drive inside it fires at most once (per
  # plan), and the 1/day cap still applies across plans.
  @anchor_min_hours 48
  @anchor_max_hours 96

  @doc "True only when the user has explicitly opted in to proactive threads."
  def threads_enabled?(account_id) when is_binary(account_id) do
    case Repo.query("SELECT proactive_threads_enabled FROM users WHERE id = $1", [
           Ecto.UUID.dump!(account_id)
         ]) do
      {:ok, %{rows: [[true]]}} -> true
      {:ok, %{rows: [[1]]}} -> true
      _ -> false
    end
  rescue
    _ -> false
  end

  def threads_enabled?(_), do: false

  @doc """
  The enable path for the P1 opt-in (settings surface writes this flag).
  A plain account preference, no proof object.

  NOTE (Repair #16 fix): this writes through the `User` schema, not a
  schemaless `"users"` update — the schemaless form cannot bind the
  binary_id column and its update silently matched zero rows (the same
  latent defect `set_opt_out/2` carried; fixed there too, below).
  """
  def set_threads_enabled(account_id, enabled)
      when is_binary(account_id) and is_boolean(enabled) do
    from(u in OpalCore.Accounts.User, where: u.id == ^account_id)
    |> Repo.update_all(set: [proactive_threads_enabled: enabled])

    :ok
  end

  def set_threads_enabled(_, _), do: :ok

  @doc """
  Attempt a `temporal_anchor_3d` proactive thread for a plan the account
  owner already made/confirmed. Returns `{:ok, result}` from
  `maybe_initiate/5`, or `{:suppressed, reason}` — including
  `:proactive_threads_not_enabled` (the default for every account),
  `:not_plan_owner`, `:already_initiated_for_plan`,
  `:outside_anchor_window`, and `:no_plan_start`.
  """
  def maybe_initiate_temporal_anchor(account_id, %SharedPlan{} = plan, opts \\ [])
      when is_binary(account_id) do
    cond do
      not threads_enabled?(account_id) ->
        {:suppressed, :proactive_threads_not_enabled}

      plan.created_by_user_id != account_id ->
        {:suppressed, :not_plan_owner}

      already_initiated_for_plan?(account_id, plan.id) ->
        {:suppressed, :already_initiated_for_plan}

      true ->
        case anchor_start(plan) do
          %DateTime{} = start ->
            hours = DateTime.diff(start, Clock.utc_now(), :second) / 3600

            if hours >= @anchor_min_hours and hours <= @anchor_max_hours do
              maybe_initiate(account_id, "temporal_anchor_3d", plan.id, anchor_reason(plan), opts)
            else
              {:suppressed, :outside_anchor_window}
            end

          _ ->
            {:suppressed, :no_plan_start}
        end
    end
  end

  def maybe_initiate_temporal_anchor(_, _, _), do: {:error, :invalid}

  # --- Repair #18 (B5b) — solo check-in rhythm caller -------------------
  #
  # Opal checks in with a user who is in a solo context (derived
  # read-time predicate in HouseholdContext: no pod, nobody held for
  # them yet) — at most once per 7 days. Gate order is the law:
  #   1. opt-in FIRST, before any other work (a user who never opted
  #      in gets exactly nothing — no thread, no Center row, no budget
  #      slot, no log row);
  #   2. solo predicate (checked by the caller of the rhythm, here, so
  #      a non-solo user is never even attempted);
  #   3. the 7-day rhythm gate on ProactiveThreadLog;
  #   4. everything inside maybe_initiate/5 unchanged (opt-out wins,
  #      7-day activity, quiet hours, 1/day cap, AttentionBudget).
  # Copy speaks about plans and openings, never about the user's
  # state; banned framings live in the track's copy law and are
  # asserted by string scan in the acceptance case.

  @solo_rhythm_days 7
  @solo_reason "Checking in - no plans on the horizon, want to find something or someone?"

  @doc """
  Attempt the solo check-in rhythm for an account. Returns
  `{:ok, result}` | `{:suppressed, reason}` where reason is one of
  `:proactive_threads_not_enabled` (checked first), `:not_solo`,
  `:rhythm_window`, or any `maybe_initiate/5` suppression.
  """
  def maybe_initiate_solo_check_in(account_id, opts \\ [])

  def maybe_initiate_solo_check_in(account_id, opts) when is_binary(account_id) do
    cond do
      not threads_enabled?(account_id) ->
        {:suppressed, :proactive_threads_not_enabled}

      not OpalCore.SocialFlow.HouseholdContext.solo?(account_id) ->
        {:suppressed, :not_solo}

      solo_rhythm_recent?(account_id) ->
        {:suppressed, :rhythm_window}

      true ->
        maybe_initiate(
          account_id,
          "solo_check_in",
          account_id,
          @solo_reason,
          Keyword.put(opts, :provenance, "stated")
        )
        |> case do
          {:ok, %{log: log}} -> {:ok, %{status: "initiated", log_id: log.id}}
          other -> other
        end
    end
  end

  def maybe_initiate_solo_check_in(_, _), do: {:error, :invalid}

  @doc "The solo check-in reason copy (single source; copy-law scanned in tests)."
  def solo_reason_copy, do: @solo_reason

  defp solo_rhythm_recent?(account_id) do
    since = DateTime.add(Clock.utc_now(), -@solo_rhythm_days * 86_400, :second)

    from(l in ProactiveThreadLog,
      where:
        l.account_id == ^account_id and l.trigger_type == "solo_check_in" and
          l.opened_at > ^since
    )
    |> Repo.exists?()
  end

  defp already_initiated_for_plan?(account_id, plan_id) do
    from(l in ProactiveThreadLog,
      where:
        l.account_id == ^account_id and l.trigger_type == "temporal_anchor_3d" and
          l.trigger_ref_id == ^plan_id
    )
    |> Repo.exists?()
  end

  defp anchor_reason(%SharedPlan{} = plan) do
    title = plan.title || "Your plan"

    when_bit =
      if is_binary(plan.time_label) and plan.time_label != "",
        do: " (#{plan.time_label})",
        else: ""

    "#{title}#{when_bit} is coming up in about 3 days. Want to get ahead of it?"
  end

  # Same canonical-start derivation as PlanCompletion (gyroscope: the
  # arbitration authority over the plan row, never a second source).
  defp anchor_start(%SharedPlan{} = plan) do
    alignment = plan.alignment || %{}

    attrs =
      alignment
      |> Map.put("start_at", plan.start_at && DateTime.to_iso8601(plan.start_at))
      |> Map.put_new("timezone", plan.timezone)

    PlanStateArbitration.canonical_start(attrs)
  end

  @doc """
  Attempt to open a proactive thread. Returns
  `{:ok, log}` | `{:suppressed, reason}` | `{:error, reason}`.
  """
  def maybe_initiate(account_id, trigger_type, trigger_ref_id, reason_copy, opts \\ [])
      when is_binary(account_id) and is_binary(trigger_type) and is_binary(reason_copy) do
    cond do
      trigger_type not in @allowed_triggers ->
        {:suppressed, :trigger_not_allowed}

      opted_out?(account_id) ->
        {:suppressed, :opt_out}

      not active_recently?(account_id) ->
        {:suppressed, :inactive_7d}

      not within_quiet_hours?(account_id, opts) ->
        {:suppressed, :quiet_hours}

      daily_cap_reached?(account_id) ->
        {:suppressed, :daily_cap}

      true ->
        ref = %{
          person_id: opts[:person_id],
          topic: trigger_type,
          date: Date.to_iso8601(Clock.utc_now() |> DateTime.to_date()),
          provenance: opts[:provenance] || "observed"
        }

        case AttentionBudget.request_slot(
               account_id,
               "proactive_thread",
               "proactive_thread",
               ref
             ) do
          {:granted, _} ->
            open_thread(account_id, trigger_type, trigger_ref_id, reason_copy, opts)

          {:denied, reason} ->
            {:suppressed, {:attention_budget, reason}}
        end
    end
  end

  def classify_opt_out(text) when is_binary(text) do
    # LLM classifies; rules fallback for tests when LLM down
    case LlmAdapter.readiness() do
      :ready ->
        messages = [
          %{
            role: "system",
            content:
              "Does the user want Opal to stop starting conversations? Reply JSON {\"opt_out\": true|false}."
          },
          %{role: "user", content: text}
        ]

        case LlmAdapter.chat(messages, temperature: 0.0, response_format: %{type: "json_object"}) do
          {:ok, %{content: content}} ->
            case Jason.decode(content) do
              {:ok, %{"opt_out" => true}} -> true
              _ -> rules_opt_out?(text)
            end

          _ ->
            rules_opt_out?(text)
        end

      _ ->
        rules_opt_out?(text)
    end
  end

  def set_opt_out(account_id, true) when is_binary(account_id) do
    # Additive users.proactive_opt_out. Repair #16: schema-bound update —
    # the previous schemaless form could not bind the binary_id column
    # and silently updated zero rows, so a recorded opt-out never
    # actually landed (the read side, `opted_out?/1`, was always fine).
    from(u in OpalCore.Accounts.User, where: u.id == ^account_id)
    |> Repo.update_all(set: [proactive_opt_out: true])

    :ok
  end

  def set_opt_out(_, _), do: :ok

  defp rules_opt_out?(text) do
    Regex.match?(
      ~r/\b(stop starting conversations|don'?t message me first|leave me alone|stop messaging me first)\b/i,
      text
    )
  end

  @doc """
  True when the account has permanently opted out of proactive
  threads. Public read for gate stacks that must check the opt-out
  without initiating anything (Repair #18 B3 in-context suggestion);
  the gate logic itself is unchanged.
  """
  def opted_out?(account_id) do
    case Repo.query("SELECT proactive_opt_out FROM users WHERE id = $1", [
           Ecto.UUID.dump!(account_id)
         ]) do
      {:ok, %{rows: [[true]]}} -> true
      {:ok, %{rows: [[1]]}} -> true
      _ -> false
    end
  rescue
    _ -> false
  end

  defp active_recently?(account_id) do
    # Prefer Opal Center activity; fall back to conversation_index
    since = DateTime.add(Clock.utc_now(), -7 * 86_400, :second)

    from(i in OpalCore.SocialMemory.ConversationIndex,
      where: i.account_id == ^account_id and i.last_activity_at >= ^since,
      limit: 1
    )
    |> Repo.exists?()
  end

  defp within_quiet_hours?(_account_id, opts) do
    # founder-tunable window 8–22 local. A caller that has already
    # resolved the owner's local hour may pass it as `local_hour`
    # (Repair #16 — deterministic seam; production callers omit it and
    # the server-local check below applies, unchanged).
    case opts[:local_hour] do
      h when is_integer(h) and h >= 0 and h <= 23 ->
        h >= @quiet_start and h < @quiet_end

      _ ->
        tz = @default_tz

        case DateTime.shift_zone(Clock.utc_now(), tz) do
          {:ok, local} -> local.hour >= @quiet_start and local.hour < @quiet_end
          _ -> true
        end
    end
  end

  defp daily_cap_reached?(account_id) do
    today = Clock.utc_now() |> DateTime.to_date()

    count =
      from(l in ProactiveThreadLog,
        where:
          l.account_id == ^account_id and
            fragment("(? AT TIME ZONE 'UTC')::date = ?", l.opened_at, ^today)
      )
      |> Repo.aggregate(:count, :id)

    count >= @max_per_day
  end

  defp open_thread(account_id, trigger_type, trigger_ref_id, reason_copy, opts) do
    template = "Reason I'm reaching out: #{reason_copy}"

    {opening, _source} =
      LlmRespond.draft_or_template(%{
        action: "proactive.open",
        template_message: template,
        account_id: account_id,
        conversation_id: opts[:conversation_id],
        entities: %{"trigger" => trigger_type, "reason" => reason_copy},
        instruction:
          "Open a proactive thread. Keep reason-first (product law). Warm, brief. Do not invent facts beyond the reason.",
        recent_messages: []
      })

    {conversation_id, delivered?} =
      case deliver_opal_center(account_id, opening) do
        {:ok, cid} -> {cid, true}
        _ -> {opts[:conversation_id], false}
      end

    {:ok, log} =
      %ProactiveThreadLog{}
      |> ProactiveThreadLog.changeset(%{
        account_id: account_id,
        trigger_type: trigger_type,
        trigger_ref_id: trigger_ref_id,
        opened_at: Clock.utc_now(),
        conversation_id: conversation_id,
        owner_response: nil
      })
      |> Repo.insert()

    Logger.info(
      "proactive.initiated account=#{account_id} trigger=#{trigger_type} ref=#{trigger_ref_id} delivered=#{delivered?}"
    )

    {:ok, %{log: log, opening_message: opening, delivered: delivered?}}
  end

  defp deliver_opal_center(user_id, body) do
    alias OpalCore.OpalConversations
    alias OpalCore.OpalConversations.OpalMessage

    with {:ok, conversation} <- OpalConversations.get_or_create_conversation(user_id),
         {:ok, _msg} <-
           %OpalMessage{}
           |> OpalMessage.changeset(%{
             "conversation_id" => conversation.id,
             "role" => "opal",
             "body" => String.slice(body, 0, OpalMessage.max_body()),
             "metadata" => %{"source" => "proactive_conversation"}
           })
           |> Repo.insert() do
      {:ok, conversation.id}
    end
  rescue
    _ -> {:error, :deliver_failed}
  end
end
