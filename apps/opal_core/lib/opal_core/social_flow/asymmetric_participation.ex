defmodule OpalCore.SocialFlow.AsymmetricParticipation do
  @moduledoc """
  Opal must work when users contribute unevenly.

  Cases:
  - one organizer + one low-effort participant
  - one user provides context; other only says yes/no/not sure
  - one user never opens private editor
  - group with partial engagement

  Opal must not require symmetric planning labor.
  Silent participants do not freeze the plan unless policy requires unanimity.
  Do not shame holdouts.
  """

  @engagement_levels ~w(organizer active low_effort yes_no silent never_editor)

  def engagement_levels, do: @engagement_levels

  @doc """
  Classify participation from simple signals (message count, shares, windows, editor opens).
  """
  def classify(signals) when is_map(signals) do
    s = stringify(signals)

    cond do
      truthy?(s["is_organizer"]) -> "organizer"
      to_int(s["private_windows"]) > 0 or to_int(s["shares"]) > 0 -> "active"
      truthy?(s["never_opened_editor"]) and to_int(s["message_count"]) == 0 -> "never_editor"
      to_int(s["message_count"]) <= 2 and yes_no_only?(s["messages"]) -> "yes_no"
      to_int(s["message_count"]) <= 1 -> "silent"
      true -> "low_effort"
    end
  end

  def classify(_), do: "silent"

  @doc """
  Whether the group can proceed without symmetric labor.

  Default: yes, as long as at least one active contributor exists and policy
  is not unanimity-required.
  """
  def can_proceed?(participants, opts \\ []) when is_list(participants) do
    policy = Keyword.get(opts, :agreement_policy, "majority_or_organizer")
    levels = Enum.map(participants, &normalize_level/1)

    active? = Enum.any?(levels, &(&1 in ~w(organizer active)))
    all_silent? = Enum.all?(levels, &(&1 in ~w(silent never_editor)))

    cond do
      policy == "unanimity" ->
        Enum.all?(levels, &(&1 in ~w(organizer active yes_no))) and not all_silent?

      all_silent? ->
        false

      active? ->
        true

      Enum.any?(levels, &(&1 == "yes_no")) ->
        true

      true ->
        false
    end
  end

  @doc """
  Intervention bias under asymmetry: do not nag silent peers; ask organizer
  the smallest useful thing.
  """
  def intervention_bias(actor_level, peer_levels) when is_list(peer_levels) do
    actor = normalize_level(actor_level)
    peers = Enum.map(peer_levels, &normalize_level/1)

    cond do
      actor in ~w(silent never_editor) ->
        # Low-effort actor: only surface if zero friction (enough_to_compute) or silence
        %{surface_policy: :minimal, ask_for_input: false, shame_holdout: false}

      actor == "yes_no" ->
        %{surface_policy: :confirm_only, ask_for_input: false, shame_holdout: false}

      Enum.all?(peers, &(&1 in ~w(silent never_editor yes_no))) ->
        # Organizer carrying the group — allow permission/input on actor only
        %{surface_policy: :organizer_carries, ask_for_input: true, shame_holdout: false}

      true ->
        %{surface_policy: :normal, ask_for_input: true, shame_holdout: false}
    end
  end

  def intervention_bias(_, _),
    do: %{surface_policy: :normal, ask_for_input: true, shame_holdout: false}

  @doc "Shared-safe summary never shames holdouts."
  def shared_summary(participants) when is_list(participants) do
    active =
      participants
      |> Enum.map(&normalize_level/1)
      |> Enum.count(&(&1 in ~w(organizer active)))

    %{
      "active_contributors" => active,
      "partial_engagement" => active < length(participants),
      "shame_holdout" => false,
      "requires_symmetric_labor" => false
    }
  end

  def shared_summary(_), do: %{"requires_symmetric_labor" => false, "shame_holdout" => false}

  defp yes_no_only?(nil), do: true

  defp yes_no_only?(messages) when is_list(messages) do
    Enum.all?(messages, fn m ->
      t = m |> to_string() |> String.downcase() |> String.trim()
      t in ~w(yes no yeah yep nope ok sure maybe idk not sure nah)
    end)
  end

  defp yes_no_only?(_), do: false

  defp normalize_level(level) when is_binary(level), do: level
  defp normalize_level(%{"engagement" => e}) when is_binary(e), do: e
  defp normalize_level(%{engagement: e}) when is_binary(e), do: e
  defp normalize_level(other) when is_map(other), do: classify(other)
  defp normalize_level(_), do: "silent"

  defp truthy?(true), do: true
  defp truthy?("true"), do: true
  defp truthy?(_), do: false

  defp to_int(nil), do: 0
  defp to_int(n) when is_integer(n), do: n
  defp to_int(n) when is_float(n), do: trunc(n)

  defp to_int(s) when is_binary(s) do
    case Integer.parse(s) do
      {i, _} -> i
      :error -> 0
    end
  end

  defp to_int(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
