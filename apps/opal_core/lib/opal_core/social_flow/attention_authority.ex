defmodule OpalCore.SocialFlow.AttentionAuthority do
  @moduledoc """
  ATTENTION / INTERVENTION decision boundary (Pass 10).

  Sits *after* Evidence → Inference → Authority → Presentation candidates.
  Something may be true, durable, and causal — and still deserve **silence**.

  Primary law:
  THE SMARTER OPAL BECOMES, THE LESS SOFTWARE THE HUMAN SHOULD HAVE TO MANAGE.

  Does **not** replace SocialReality, ProductSignals, Chronology, or AlignmentAuthority.
  Consumes their outputs and decides human-facing consequence.

  Builds on:
  - `Execution.AttentionTier` (prepare early, interrupt late)
  - `InterventionResolution` (silence is success)
  - `Ambient.InterruptionDebt` (surface cost — not reimplemented here)

  Internal interruption classes (never product labels):
  ambient | useful_now | action_required | time_sensitive | critical | silence
  """

  alias OpalCore.SocialFlow.Execution.AttentionTier

  @classes ~w(silence ambient useful_now action_required time_sensitive critical)

  def classes, do: @classes

  @doc "Rank for comparison (higher = more interruptive)."
  def class_rank(class) when is_binary(class) do
    case class do
      "silence" -> 0
      "ambient" -> 1
      "useful_now" -> 2
      "action_required" -> 3
      "time_sensitive" -> 4
      "critical" -> 5
      _ -> 0
    end
  end

  def class_rank(_), do: 0

  @doc """
  Evaluate a single reality/signal projection for attention.

  Expected keys (all optional; pure map API):
  - `:next_gap` — SocialReality next_gap atom or string
  - `:lifecycle_stage` / `:stage`
  - `:requires_user_action` boolean
  - `:member_count` / `:participant_count`
  - `:sufficiency` — intention | converging | usable
  - `:has_meaningful_dims` — what/when/where any known
  - `:duplicate_of_active` — true when same lineage already surfaced
  - `:recompute_only` — true when backend recompute with no human delta
  - `:minutes_until` — integer | nil for temporal urgency
  - `:leave_by_relevant` — travel leave window matters now
  - `:private_memory_only` — only private memory changed
  - `:kind` — proposal | signal | etc.
  """
  @spec evaluate(map()) :: %{
          class: String.t(),
          should_surface_home: boolean(),
          should_surface_chat_filament: boolean(),
          should_interrupt: boolean(),
          may_notify: boolean(),
          tier: String.t(),
          priority: integer(),
          reason: String.t(),
          channel: String.t() | nil
        }
  def evaluate(facts) when is_map(facts) do
    facts = stringify_keys(facts)

    cond do
      truthy?(facts["recompute_only"]) ->
        pack("silence", false, false, false, "dormant", "recompute_no_delta")

      truthy?(facts["duplicate_of_active"]) ->
        pack("silence", false, false, false, "dormant", "duplicate_lineage")

      truthy?(facts["private_memory_only"]) ->
        # Private memory may improve Curate ranking without Home noise.
        pack("silence", false, false, false, "watch", "private_memory_no_home")

      facts["kind"] == "proposal" ->
        pack("silence", false, false, false, "dormant", "proposal_satellite")

      handled_recall?(facts) ->
        # Recede from Home by default; Plans/recall may still load.
        pack("ambient", false, false, false, "dormant", "handled_recede")

      truthy?(facts["leave_by_relevant"]) or leave_window?(facts["minutes_until"]) ->
        pack(
          "time_sensitive",
          true,
          true,
          true,
          "urgent_actionable",
          "leave_window",
          "in_app_actionable"
        )

      actionable_gap?(facts["next_gap"]) and truthy?(facts["requires_user_action"] || true) ->
        pack(
          "action_required",
          true,
          true,
          false,
          "actionable",
          "next_gap_action",
          "in_app_actionable"
        )

      usable_active?(facts) and approaching?(facts["minutes_until"]) ->
        pack("useful_now", true, true, false, "actionable", "approaching_usable", "in_app_passive")

      usable_active?(facts) ->
        pack("useful_now", true, false, false, "prepare", "usable_ambient", "in_app_passive")

      converging?(facts) ->
        pack("ambient", true, false, false, "watch", "converging_field", "in_app_passive")

      weak_intention?(facts) ->
        pack("silence", false, false, false, "dormant", "weak_intention")

      true ->
        pack("silence", false, false, false, "dormant", "no_attention_justified")
    end
  end

  def evaluate(_), do: pack("silence", false, false, false, "dormant", "invalid_facts")

  @doc """
  Compress many evaluations into a sparse Home field.

  Returns ordered list of attention decisions with original signal index.
  Suppresses silence. Caps ambient/useful presence so Home is not a feed.
  """
  @spec compose_home_field([{map(), any()}], keyword()) :: [
          %{item: any(), decision: map(), band: String.t()}
        ]
  def compose_home_field(items, opts \\ []) when is_list(items) do
    max_now = Keyword.get(opts, :max_now, 2)
    max_later = Keyword.get(opts, :max_later, 3)
    max_quiet = Keyword.get(opts, :max_quiet, 2)

    evaluated =
      Enum.map(items, fn {facts, item} ->
        d = evaluate(facts)
        {item, d, band_for(d)}
      end)
      |> Enum.filter(fn {_item, d, _band} -> d.should_surface_home end)
      |> Enum.sort_by(fn {_item, d, _band} -> -d.priority end)

    now =
      evaluated
      |> Enum.filter(fn {_, _, band} -> band == "now" end)
      |> Enum.take(max_now)

    later =
      evaluated
      |> Enum.filter(fn {_, _, band} -> band == "later" end)
      |> Enum.take(max_later)

    quiet =
      evaluated
      |> Enum.filter(fn {_, _, band} -> band == "quiet" end)
      |> Enum.take(max_quiet)

    (now ++ later ++ quiet)
    |> Enum.map(fn {item, d, band} -> %{item: item, decision: d, band: band} end)
  end

  @doc """
  Notification / interrupt policy for a semantic consequence id.

  Pure: given previous notice and new evaluation, decide notify / suppress / supersede.
  Does not send OS push — policy only.
  """
  @spec notification_policy(map(), map() | nil) :: %{
          action: :notify | :suppress | :supersede | :silent,
          reason: String.t(),
          consequence_id: String.t() | nil
        }
  def notification_policy(new_facts, previous \\ nil) when is_map(new_facts) do
    d = evaluate(new_facts)
    cid = consequence_id(new_facts)

    cond do
      not d.may_notify ->
        %{action: :silent, reason: d.reason, consequence_id: cid}

      is_map(previous) and previous[:consequence_id] == cid and
          previous[:class] == d.class and previous[:payload_key] == payload_key(new_facts) ->
        %{action: :suppress, reason: "dedupe_same_consequence", consequence_id: cid}

      is_map(previous) and previous[:consequence_id] == cid and
          previous[:payload_key] != payload_key(new_facts) ->
        %{action: :supersede, reason: "same_lineage_updated", consequence_id: cid}

      d.should_interrupt or d.class in ~w(time_sensitive critical) ->
        %{action: :notify, reason: d.reason, consequence_id: cid}

      true ->
        %{action: :silent, reason: "not_interruptive", consequence_id: cid}
    end
  end

  @doc "Whether a chronology/filament row should show in Chat by default."
  def filament_visible?(facts) when is_map(facts) do
    d = evaluate(facts)
    d.should_surface_chat_filament and d.class != "silence"
  end

  def filament_visible?(_), do: false

  # --- internals ---

  defp pack(class, home, filament, interrupt, tier, reason, channel \\ nil) do
    tier_n = AttentionTier.normalize(tier)
    # Home ambient may surface without AttentionTier.may_surface? (that gates push-tier).
    # Interrupt/push still respects tier + class.
    may_push =
      interrupt and
        (AttentionTier.may_push?(tier_n) or class in ~w(time_sensitive critical))

    %{
      class: class,
      should_surface_home: home == true,
      should_surface_chat_filament: filament == true,
      should_interrupt: may_push,
      may_notify: may_push,
      tier: tier_n,
      priority: class_rank(class) * 10 + AttentionTier.rank(tier_n),
      reason: to_string(reason),
      channel: channel
    }
  end

  defp band_for(%{class: class}) do
    case class do
      c when c in ~w(action_required time_sensitive critical) -> "now"
      "useful_now" -> "now"
      "ambient" -> "later"
      _ -> "quiet"
    end
  end

  defp actionable_gap?(gap) do
    g = gap |> to_string() |> String.downcase()
    g in ~w(time place activity participants open_loop)
  end

  defp usable_active?(facts) do
    suf = facts["sufficiency"] |> to_string()
    stage = stage(facts)
    suf == "usable" or stage in ~w(set ready)
  end

  defp converging?(facts) do
    suf = facts["sufficiency"] |> to_string()
    stage = stage(facts)
    suf == "converging" or stage in ~w(still_open plan_forming) or truthy?(facts["has_meaningful_dims"])
  end

  defp handled_recall?(facts) do
    stage(facts) in ~w(handled canceled quiet)
  end

  defp weak_intention?(facts) do
    suf = facts["sufficiency"] |> to_string()
    stage = stage(facts)
    (suf == "intention" or stage in ~w(quiet) or stage == "") and not truthy?(facts["has_meaningful_dims"])
  end

  defp approaching?(mins) when is_integer(mins), do: mins >= 0 and mins <= 24 * 60
  defp approaching?(_), do: false

  defp leave_window?(mins) when is_integer(mins), do: mins >= 0 and mins <= 120
  defp leave_window?(_), do: false

  defp stage(facts) do
    (facts["lifecycle_stage"] || facts["stage"] || "")
    |> to_string()
    |> String.downcase()
  end

  defp consequence_id(facts) do
    facts["consequence_id"] ||
      facts["conversation_id"] ||
      facts["lineage_id"] ||
      nil
  end

  defp payload_key(facts) do
    [
      facts["next_gap"],
      facts["when"],
      facts["where"],
      facts["leave_by"],
      facts["lifecycle_stage"] || facts["stage"]
    ]
    |> Enum.map(&to_string/1)
    |> Enum.join("|")
  end

  defp truthy?(v), do: v == true or v == "true" or v == 1

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
