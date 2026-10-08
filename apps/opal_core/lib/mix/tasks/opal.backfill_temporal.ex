defmodule Mix.Tasks.Opal.BackfillTemporal do
  @moduledoc """
  Backfill temporal_anchors from known_facts + conversation summaries.

  Backfilled anchors always have needs_confirmation: true (never auto-confirmed).

  Usage:
    mix opal.backfill_temporal            # dry-run
    mix opal.backfill_temporal --apply    # write
  """
  use Mix.Task

  @shortdoc "Backfill temporal anchors (dry-run by default)"

  alias OpalCore.Repo
  alias OpalCore.Intelligence.TemporalResolver
  alias OpalCore.SocialMemory.{ConversationIndex, PersonMemory}

  import Ecto.Query

  @impl Mix.Task
  def run(args) do
    Mix.Task.run("app.start")
    apply? = "--apply" in args
    ref = Date.utc_today()

    facts =
      from(p in PersonMemory, where: fragment("known_facts <> '{}'::jsonb"))
      |> Repo.all()

    found = []

    found =
      Enum.reduce(facts, found, fn p, acc ->
        Enum.reduce(p.known_facts || %{}, acc, fn {key, val}, acc2 ->
          text =
            cond do
              is_map(val) -> val["value"] || val[:value] || ""
              is_binary(val) -> val
              true -> ""
            end

          if is_binary(text) and text != "" and
               (String.contains?(String.downcase(to_string(key)), "birthday") or
                  String.match?(text, ~r/birthday|anniversary|june|deadline|every\s+/i)) do
            person_id = if p.person_id == p.account_id, do: nil, else: p.person_id

            case TemporalResolver.resolve(text, [], ref, p.account_id, person_id) do
              {:ok, list} when list != [] ->
                list =
                  Enum.map(list, fn a ->
                    a
                    |> Map.put(:needs_confirmation, true)
                    |> Map.put(:confirmed, false)
                    |> Map.put(:confidence, min(Map.get(a, :confidence, 0.4), 0.5))
                  end)

                if apply? do
                  _ = TemporalResolver.upsert_anchors(list)
                end

                [%{account_id: p.account_id, source: :known_facts, count: length(list)} | acc2]

              _ ->
                acc2
            end
          else
            acc2
          end
        end)
      end)

    summaries =
      from(i in ConversationIndex, where: not is_nil(i.rolling_summary))
      |> Repo.all()

    found =
      Enum.reduce(summaries, found, fn i, acc ->
        text = i.rolling_summary || ""

        if String.match?(text, ~r/birthday|anniversary|deadline|every\s+(mon|tue|wed|thu|fri|sat|sun)/i) do
          case TemporalResolver.resolve(text, [], ref, i.account_id, nil) do
            {:ok, list} when list != [] ->
              list =
                Enum.map(list, fn a ->
                  a
                  |> Map.put(:needs_confirmation, true)
                  |> Map.put(:confirmed, false)
                  |> Map.put(:confidence, min(Map.get(a, :confidence, 0.4), 0.5))
                end)

              if apply? do
                _ = TemporalResolver.upsert_anchors(list)
              end

              [%{account_id: i.account_id, source: :summary, count: length(list)} | acc]

            _ ->
              acc
          end
        else
          acc
        end
      end)

    mode = if apply?, do: "APPLY", else: "DRY-RUN"
    Mix.shell().info("opal.backfill_temporal mode=#{mode} findings=#{length(found)}")
    Enum.each(found, fn f -> Mix.shell().info("  #{inspect(f)}") end)
    :ok
  end
end
