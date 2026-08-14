defmodule OpalCore.SocialFlow.SocialReality do
  @moduledoc """
  Whole-picture social reality projection — not a linear workflow.

  Users do not enter "share time" or "share place" journeys.
  They talk. Opal derives the current Shared Reality and the **one**
  next meaningful gap from known dimensions.

  Dimensions: WHO · WHAT · WHEN · WHERE · PARTICIPATION · AUTHORITY

  Order-agnostic: time→place, place→time, fixed event, remote (no place),
  open-ended time, home, group recompose — same engine.

  Not Set authority. Not a second ProductSignals store.
  """

  alias OpalCore.SocialFlow.SharedRealityPresentation

  @gaps ~w(none time place activity participants confirm_required_person execution transport payment provider_handoff)

  @doc """
  Project conversation evidence into a reality map + next gap + actions.

  `messages` — list of maps with body / sender_user_id
  `stage` — AlignmentAuthority lifecycle atom or string
  `opts` — optional `:activity_kind`, `:remote?`, `:home?`, `:fixed_event?`
  """
  def project(messages, stage, opts \\ []) when is_list(messages) do
    stage_a = normalize_stage(stage)
    base = SharedRealityPresentation.from_messages(messages, stage_a)
    remote? = opts[:remote?] == true or remote_activity?(base["what"])
    home? = opts[:home?] == true or home_place?(base["where"], messages)
    fixed? = opts[:fixed_event?] == true or fixed_event?(messages)

    dims = %{
      "who_known" => (base["speaker_count"] || 0) >= 2 or stage_a in [:set, :ready, :handled],
      "what_known" => present?(base["what"]),
      "when_known" => present?(base["when"]),
      "where_known" => present?(base["where"]) or home?,
      "where_matters" => where_matters?(base["what"], remote?, fixed?),
      "remote" => remote?,
      "home" => home?,
      "fixed_event" => fixed?,
      "speaker_count" => base["speaker_count"] || 0
    }

    gaps = refine_gaps(base["gaps"] || [], dims, stage_a)
    next = next_meaningful_gap(gaps, dims, stage_a)
    actions = available_actions(next, dims, stage_a)

    base
    |> Map.put("dimensions", dims)
    |> Map.put("gaps", gaps)
    |> Map.put("next_gap", Atom.to_string(next))
    |> Map.put("next_actions", actions)
    |> Map.put("primary_action", List.first(actions))
    |> Map.put("schema_version", "0.2.0")
    |> Map.put("authorizes_set", false)
    |> Map.put("workflow_owner", "shared_reality")
  end

  @doc """
  Pure next-gap from already-known dimension flags / presentation gaps.

  Prefer this in unit tests and client mirrors.
  """
  def next_meaningful_gap(gaps, dims \\ %{}, stage \\ :still_open)

  def next_meaningful_gap(gaps, dims, stage) when is_list(gaps) do
    d = stringify(dims)
    stage_a = normalize_stage(stage)
    gaps = Enum.map(gaps, &to_string/1)

    cond do
      stage_a in [:handled, :canceled, :quiet] ->
        :none

      d["fixed_event"] == true and "who" in gaps ->
        :participants

      d["fixed_event"] == true and gaps == [] ->
        :none

      "when" in gaps ->
        :time

      "where" in gaps and d["where_matters"] != false ->
        :place

      "what" in gaps ->
        :activity

      "who" in gaps or "confirmation" in gaps ->
        if d["speaker_count"] && d["speaker_count"] >= 3,
          do: :participants,
          else: :confirm_required_person

      true ->
        :none
    end
  end

  def next_meaningful_gap(_, _, _), do: :none

  @doc "Human CTA labels for a next gap — never enum names."
  def action_label(:time), do: "Find a time"
  def action_label(:place), do: "Choose a place"
  def action_label(:activity), do: "What's the plan?"
  def action_label(:participants), do: "See who's in"
  def action_label(:confirm_required_person), do: "Check in"
  def action_label(:execution), do: "Get ready"
  def action_label(:transport), do: "How to get there"
  def action_label(:none), do: nil
  def action_label(other) when is_atom(other), do: nil
  def action_label(s) when is_binary(s), do: action_label(String.to_existing_atom(s))

  def action_label(_), do: nil

  @doc """
  Available action contracts for the gap (shared-safe labels).

  Each: dimension, verb, label, opens (sheet kind)
  """
  def available_actions(next, dims \\ %{}, stage \\ :still_open)

  def available_actions(:time, _dims, _stage) do
    [
      %{
        "dimension" => "when",
        "verb" => "resolve",
        "label" => "Find a time",
        "opens" => "time_sheet",
        "share_kind" => "time"
      },
      %{
        "dimension" => "when",
        "verb" => "share",
        "label" => "Share a time",
        "opens" => "time_sheet",
        "share_kind" => "time"
      }
    ]
  end

  def available_actions(:place, _dims, _stage) do
    [
      %{
        "dimension" => "where",
        "verb" => "resolve",
        "label" => "Choose a place",
        "opens" => "place_sheet",
        "share_kind" => "place"
      },
      %{
        "dimension" => "where",
        "verb" => "curate",
        "label" => "Curate a place",
        "opens" => "curate",
        "share_kind" => "place"
      },
      %{
        "dimension" => "where",
        "verb" => "share",
        "label" => "Share a place",
        "opens" => "place_sheet",
        "share_kind" => "place"
      }
    ]
  end

  def available_actions(:activity, _, _) do
    [
      %{
        "dimension" => "what",
        "verb" => "resolve",
        "label" => "What's the plan?",
        "opens" => "activity",
        "share_kind" => "activity"
      }
    ]
  end

  def available_actions(:none, dims, stage) do
    stage_a = normalize_stage(stage)
    when_known? = dims["when_known"] in [true, "true", 1]

    if OpalCore.SocialFlow.ExperienceContinuation.available?(stage_a, when_known?) do
      # Contextual continuation (morning/day/evening/night/remote) — not night-hardcoded domain.
      # opens remains "extend" for existing private surface wiring.
      cont =
        OpalCore.SocialFlow.ExperienceContinuation.present(%{
          "hour" => dims["hour"] || dims[:hour] || 20,
          "remote?" => dims["remote"] || dims["remote?"] || false,
          "weekend?" => dims["weekend?"] || false,
          "participant_count" => dims["member_count"] || dims["participant_count"] || 2
        })

      [cont]
    else
      []
    end
  end

  def available_actions(other, dims, stage) when is_atom(other) do
    label = action_label(other)

    if label do
      [
        %{
          "dimension" => to_string(other),
          "verb" => "resolve",
          "label" => label,
          "opens" => to_string(other),
          "share_kind" => nil
        }
      ]
    else
      available_actions(:none, dims, stage)
    end
  end

  def available_actions(_, _, _), do: []

  @doc """
  Partial preservation: apply a dimension update without wiping others.

  `update` keys: what, when, where (nil means leave unchanged; `:clear` clears)
  """
  def apply_dimension_update(reality, update) when is_map(reality) and is_map(update) do
    u = stringify(update)

    what = patch(reality["what"], u["what"])
    when_l = patch(reality["when"], u["when"])
    where = patch(reality["where"], u["where"])

    # Re-derive gaps without full message reparse
    stage = normalize_stage(u["stage"] || reality["lifecycle_stage"] || :still_open)

    dims = %{
      "what_known" => present?(what),
      "when_known" => present?(when_l),
      "where_known" => present?(where),
      "where_matters" => where_matters?(what, reality["dimensions"]["remote"] == true, false),
      "speaker_count" => reality["speaker_count"] || reality["dimensions"]["speaker_count"] || 2
    }

    gaps =
      refine_gaps(
        [
          if(present?(what), do: nil, else: "what"),
          if(present?(when_l), do: nil, else: "when"),
          if(dims["where_matters"] and not present?(where), do: "where", else: nil)
        ]
        |> Enum.reject(&is_nil/1),
        dims,
        stage
      )

    next = next_meaningful_gap(gaps, dims, stage)

    reality
    |> Map.put("what", what)
    |> Map.put("when", when_l)
    |> Map.put("where", where)
    |> Map.put("gaps", gaps)
    |> Map.put("next_gap", Atom.to_string(next))
    |> Map.put("next_actions", available_actions(next, dims, stage))
    |> Map.put("primary_action", List.first(available_actions(next, dims, stage)))
    |> Map.put("dimensions", Map.merge(reality["dimensions"] || %{}, dims))
  end

  def apply_dimension_update(r, _), do: r

  @doc """
  Private leave-around line when start + travel minutes are known.

  Never invents travel. Never exposes origin to peers.
  """
  def private_leave_around(start_at, travel_minutes, opts \\ [])

  def private_leave_around(%DateTime{} = start_at, travel_minutes, opts)
      when is_number(travel_minutes) and travel_minutes >= 0 do
    alias OpalCore.SocialFlow.Feasibility.Buffer

    leave =
      Buffer.leave_by(start_at, travel_minutes,
        mode: Keyword.get(opts, :mode, :driving),
        context: Keyword.get(opts, :context)
      )

    {:ok,
     %{
       "leave_by" => leave,
       "leave_around_label" => leave_around_label(leave),
       "distance_label" => "#{round(travel_minutes)} min from you",
       "private" => true,
       "origin_exposed" => false,
       "authorizes_set" => false
     }}
  end

  def private_leave_around(_, _, _), do: {:error, :insufficient_travel_truth}

  defp leave_around_label(%DateTime{} = dt) do
    # UTC wall clock for internal; clients reformat in locale.
    h = dt.hour
    m = dt.minute
    {h12, ampm} = if h >= 12, do: {if(h == 12, do: 12, else: h - 12), "PM"}, else: {if(h == 0, do: 12, else: h), "AM"}

    time =
      if m == 0 do
        "#{h12} #{ampm}"
      else
        "#{h12}:#{String.pad_leading(Integer.to_string(m), 2, "0")} #{ampm}"
      end

    "Leave around #{time}"
  end

  defp leave_around_label(_), do: nil

  @doc "Assert share payload kind matches dimension - no cross-wire."
  def assert_share_kind!(payload, expected) when is_map(payload) do
    p = stringify(payload)
    kind = p["share_kind"] || p["kind"] || p["dimension"]

    cond do
      expected == "place" and kind in ["place", "where"] ->
        if p["windows"] || p["display_start"] do
          raise "PLACE_SHARE_NEVER_SERIALIZES_TIME_ONLY_PAYLOAD"
        end

        :ok

      expected == "time" and kind in ["time", "when", "availability"] ->
        if p["place_id"] || p["venue"] || p["place_name"] do
          # time share may omit place; if present that's ok for settlement
          :ok
        else
          :ok
        end

      expected == "place" ->
        raise "place share payload missing place kind: #{inspect(kind)}"

      true ->
        :ok
    end
  end

  def assert_share_kind!(_, _), do: {:error, :invalid}

  def gaps, do: @gaps

  # --- internals ---

  defp refine_gaps(gaps, dims, stage) do
    d = stringify(dims)
    gaps = Enum.map(List.wrap(gaps), &to_string/1)

    gaps =
      if d["where_matters"] == false do
        Enum.reject(gaps, &(&1 == "where"))
      else
        gaps
      end

    gaps =
      if d["when_known"] == true do
        Enum.reject(gaps, &(&1 == "when"))
      else
        gaps
      end

    gaps =
      if d["where_known"] == true do
        Enum.reject(gaps, &(&1 == "where"))
      else
        gaps
      end

    gaps =
      if d["what_known"] == true do
        Enum.reject(gaps, &(&1 == "what"))
      else
        gaps
      end

    # If presentation didn't list where but place matters and unknown, add it once time known
    gaps =
      if d["where_matters"] != false and d["where_known"] != true and d["when_known"] == true and
           stage in [:still_open, :set, :ready] and "where" not in gaps do
        gaps ++ ["where"]
      else
        gaps
      end

    Enum.uniq(gaps)
  end

  defp where_matters?(_what, true, _), do: false
  defp where_matters?(_, _, true), do: true

  defp where_matters?(what, false, _) do
    w = what || ""

    w in ["Dinner", "Lunch", "Coffee", "Drinks", "Birthday"] or
      Regex.match?(~r/dinner|coffee|lunch|drinks|sushi|restaurant|brunch|concert|show/i, w)
  end

  defp remote_activity?(what) when is_binary(what) do
    Regex.match?(~r/call|facetime|zoom|online|game|remote|phone|video/i, what)
  end

  defp remote_activity?(_), do: false

  defp home_place?(where, messages) when is_binary(where) do
    Regex.match?(~r/\b(home|my place|our place|house)\b/i, where) or
      home_in_messages?(messages)
  end

  defp home_place?(_, messages), do: home_in_messages?(messages)

  defp home_in_messages?(messages) when is_list(messages) do
    text =
      messages
      |> Enum.map(fn m -> Map.get(m, :body) || Map.get(m, "body") || "" end)
      |> Enum.join(" ")

    Regex.match?(~r/\b(come over|my place|our place|at home|at my house)\b/i, text)
  end

  defp home_in_messages?(_), do: false

  defp fixed_event?(messages) when is_list(messages) do
    text =
      messages
      |> Enum.map(fn m -> Map.get(m, :body) || Map.get(m, "body") || "" end)
      |> Enum.join(" ")

    Regex.match?(~r/\b(concert|show|game|tickets?|kickoff|starts at)\b/i, text)
  end

  defp fixed_event?(_), do: false

  defp present?(nil), do: false
  defp present?(""), do: false
  defp present?(s) when is_binary(s), do: String.trim(s) != ""
  defp present?(_), do: false

  defp patch(_cur, :clear), do: nil
  defp patch(_cur, "clear"), do: nil
  defp patch(cur, nil), do: cur
  defp patch(_cur, v), do: v

  defp normalize_stage(s) when is_atom(s), do: s

  defp normalize_stage(s) when is_binary(s) do
    try do
      String.to_existing_atom(s)
    rescue
      _ -> :still_open
    end
  end

  defp normalize_stage(_), do: :still_open

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
