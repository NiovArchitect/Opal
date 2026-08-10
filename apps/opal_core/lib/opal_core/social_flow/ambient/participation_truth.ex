defmodule OpalCore.SocialFlow.Ambient.ParticipationTruth do
  @moduledoc """
  Social participation truth for Ambient Opportunity.

  Silence is not decline.
  Maybe is not in.
  Optional miss is not shame.
  Required miss may block.
  """

  @doc """
  Classify a response token into participation truth.
  """
  def classify(response) when is_binary(response) do
    case response do
      r when r in ~w(im_in in yes affirmative confirmed) ->
        %{"state" => "in", "counts_toward_quorum" => true, "is_decline" => false}

      r when r in ~w(maybe need_another_time) ->
        %{"state" => "maybe", "counts_toward_quorum" => false, "is_decline" => false}

      r when r in ~w(not_this_time declined out no unavailable) ->
        %{"state" => "out", "counts_toward_quorum" => false, "is_decline" => true}

      r when r in ~w(silent undecided private) ->
        # Silence ≠ decline
        %{"state" => "silent", "counts_toward_quorum" => false, "is_decline" => false}

      _ ->
        %{"state" => "silent", "counts_toward_quorum" => false, "is_decline" => false}
    end
  end

  def classify(_),
    do: %{"state" => "silent", "counts_toward_quorum" => false, "is_decline" => false}

  @doc """
  Shared-safe summary: never names holdouts or equates silence with rejection.
  """
  def shared_summary(people) when is_list(people) do
    states =
      people
      |> Enum.map(fn p ->
        p = stringify(p)
        classify(p["response"] || p["status"] || "undecided")["state"]
      end)

    in_n = Enum.count(states, &(&1 == "in"))
    out_n = Enum.count(states, &(&1 == "out"))
    silent_n = Enum.count(states, &(&1 == "silent"))
    maybe_n = Enum.count(states, &(&1 == "maybe"))

    copy =
      cond do
        in_n >= 2 and out_n == 0 and silent_n + maybe_n > 0 ->
          "This works for enough of the group."

        in_n >= 1 and out_n > 0 ->
          "This may not work for everyone."

        in_n == 0 ->
          "Still forming."

        true ->
          "This works for enough of the group."
      end

    %{
      "shared_safe" => true,
      "benefit_copy" => copy,
      "in_count" => in_n,
      "out_count" => out_n,
      "silent_count" => silent_n,
      "maybe_count" => maybe_n,
      "silence_is_not_decline" => true,
      "no_names" => true,
      "no_holdout_shame" => true
    }
  end

  def shared_summary(_), do: %{"shared_safe" => true, "benefit_copy" => "Still forming."}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
