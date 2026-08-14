defmodule OpalCore.SocialFlow.ExperienceContinuation do
  @moduledoc """
  Contextual **experience continuation** (Pass 10).

  Domain capability is *continue the moment* — not “extend the night” as truth.

  Presentation labels derive from:
  - daypart (morning / afternoon / evening / night / weekend day)
  - activity / remote vs in-person
  - solo vs group
  - stage (set/ready)

  Private-first: selecting a continuation does **not** auto-send.

  Does not hard-code night as required semantic state.
  """

  @dayparts ~w(morning afternoon evening night day remote)

  def dayparts, do: @dayparts

  @doc """
  Infer daypart from clock hour (0–23) and optional flags.

  Options:
  - `:weekend?` boolean
  - `:remote?` boolean — FaceTime / call / remote hang
  """
  def daypart_from_hour(hour, opts \\ [])

  def daypart_from_hour(hour, opts) when is_integer(hour) do
    cond do
      Keyword.get(opts, :remote?, false) -> "remote"
      hour >= 5 and hour < 12 -> if(Keyword.get(opts, :weekend?, false), do: "day", else: "morning")
      hour >= 12 and hour < 17 -> "afternoon"
      hour >= 17 and hour < 21 -> "evening"
      true -> "night"
    end
  end

  def daypart_from_hour(_, _), do: "evening"

  @doc """
  Human presentation for continuation CTA.

  Returns map:
  - `verb` — always `"continue"` (stable domain verb)
  - `label` — contextual phrase
  - `opens` — `"extend"` (existing private surface; not renamed mid-flight)
  - `daypart`
  - `solo?`
  """
  def present(context) when is_map(context) do
    c = stringify_keys(context)
    hour = c["hour"]
    daypart =
      c["daypart"] ||
        daypart_from_hour(
          if(is_integer(hour), do: hour, else: 19),
          remote?: truthy?(c["remote?"] || c["remote"]),
          weekend?: truthy?(c["weekend?"])
        )

    solo? = participant_count(c) <= 1
    label = label_for(daypart, solo?, c)

    %{
      "dimension" => "execution",
      "verb" => "continue",
      "label" => label,
      "opens" => "extend",
      "share_kind" => nil,
      "daypart" => daypart,
      "solo?" => solo?,
      # Back-compat for clients that still match verb=extend
      "legacy_verb" => "extend"
    }
  end

  def present(_), do: present(%{"hour" => 20})

  @doc "Whether continuation is available for stage + when known."
  def available?(stage, when_known?) do
    s = stage |> to_string() |> String.downcase()
    s in ~w(set ready) and when_known? in [true, "true", 1]
  end

  @doc """
  Whether continuation should be suppressed despite set/ready.

  Context keys:
  - `:minutes_to_next_commitment` — if short, do not offer long continuation
  - `:user_indicated_leaving` boolean
  - `:plan_incomplete` boolean
  - `:inappropriate` boolean
  """
  def suppressed?(context) when is_map(context) do
    c = stringify_keys(context)

    cond do
      truthy?(c["user_indicated_leaving"]) ->
        {true, "user_leaving"}

      truthy?(c["plan_incomplete"]) ->
        {true, "plan_incomplete"}

      truthy?(c["inappropriate"]) ->
        {true, "context_inappropriate"}

      is_integer(c["minutes_to_next_commitment"]) and c["minutes_to_next_commitment"] < 45 ->
        {true, "next_commitment_soon"}

      true ->
        {false, nil}
    end
  end

  def suppressed?(_), do: {false, nil}

  defp label_for("morning", true, _), do: "Keep the morning going"
  defp label_for("morning", false, _), do: "Keep the morning going"
  defp label_for("afternoon", true, _), do: "Keep the day going"
  defp label_for("afternoon", false, _), do: "Go somewhere next"
  defp label_for("evening", true, _), do: "Keep the evening going"
  defp label_for("evening", false, _), do: "Keep the evening going"
  defp label_for("night", true, _), do: "Extend the night"
  defp label_for("night", false, _), do: "Extend the night"
  defp label_for("day", true, _), do: "Keep the day going"
  defp label_for("day", false, _), do: "Keep the day going"
  defp label_for("remote", true, _), do: "Keep hanging out"
  defp label_for("remote", false, _), do: "Keep hanging out"
  defp label_for(_, true, _), do: "Continue"
  defp label_for(_, false, _), do: "Continue the moment"

  defp participant_count(c) do
    c["participant_count"] || c["member_count"] || 2
  end

  defp truthy?(v), do: v == true or v == "true" or v == 1

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
