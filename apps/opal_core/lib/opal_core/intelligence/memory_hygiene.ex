defmodule OpalCore.Intelligence.MemoryHygiene do
  @moduledoc """
  Contradiction resolution + revalidation prompt helpers (Paste E3).

  On contradiction: ask once; winner kept; loser archived with `superseded_by`.
  Never deletes.
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialMemory.{PersonMemory, TemporalAnchor}

  @doc "Prompt instruction when any known_fact is flagged needs_revalidation."
  def revalidation_prompt_instruction(account_id) when is_binary(account_id) do
    flagged =
      from(p in PersonMemory, where: p.account_id == ^account_id)
      |> Repo.all()
      |> Enum.flat_map(fn p ->
        (p.known_facts || %{})
        |> Enum.filter(fn {_k, v} -> is_map(v) and (v["needs_revalidation"] == true or v[:needs_revalidation] == true) end)
        |> Enum.map(fn {k, v} -> {p.person_id, k, v} end)
      end)

    if flagged == [] do
      nil
    else
      lines =
        Enum.map_join(Enum.take(flagged, 3), "; ", fn {person, key, v} ->
          "#{key} for #{person} (was #{inspect(v["value"] || v[:value])})"
        end)

      "Some memories need a gentle re-check (ask at most once): #{lines}."
    end
  end

  @doc """
  Resolve a contradiction between two temporal anchors for the same person/type.
  `winner_id` is kept; `loser_id` archived with superseded_by. Asks-once flag on winner.
  """
  def resolve_anchor_contradiction(account_id, winner_id, loser_id)
      when is_binary(account_id) and is_binary(winner_id) and is_binary(loser_id) do
    with %TemporalAnchor{account_id: ^account_id} = winner <- Repo.get(TemporalAnchor, winner_id),
         %TemporalAnchor{account_id: ^account_id} = loser <- Repo.get(TemporalAnchor, loser_id) do
      {:ok, loser} =
        loser
        |> TemporalAnchor.changeset(%{archived: true, superseded_by: winner.id})
        |> Repo.update()

      {:ok, winner} =
        winner
        |> TemporalAnchor.changeset(%{
          needs_confirmation: false,
          confirmed: true,
          source_text: (winner.source_text || "") <> " [contradiction_resolved]"
        })
        |> Repo.update()

      Logger.info(
        "memory_hygiene.contradiction account=#{account_id} winner=#{winner.id} loser=#{loser.id}"
      )

      {:ok, %{winner: winner, loser: loser}}
    else
      _ -> {:error, :not_found}
    end
  end

  @doc "Detect same person+type anchors with different dates (candidates to ask once)."
  def detect_anchor_contradictions(account_id) when is_binary(account_id) do
    from(a in TemporalAnchor,
      where: a.account_id == ^account_id and a.archived == false,
      select: a
    )
    |> Repo.all()
    |> Enum.group_by(fn a -> {a.person_id, a.anchor_type} end)
    |> Enum.flat_map(fn {{_person, _type}, list} ->
      dates = list |> Enum.map(& &1.date) |> Enum.uniq()

      if length(list) > 1 and length(dates) > 1 do
        [Enum.sort_by(list, & &1.confidence, :desc)]
      else
        []
      end
    end)
  end
end
