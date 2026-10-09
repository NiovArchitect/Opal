defmodule OpalCore.Intelligence.ExtractionPressureTest do
  @moduledoc """
  Paste H Phase 4 — EXTRACTION UNDER FIRE (single-user).

  Scores `Extractor.classify_message/1` (rules floor) against
  `shots/intelligence/extraction_corpus.json` for deterministic precision/recall
  on people / times / intents. LLM path is intentionally not used here.

  Writes `shots/intelligence/EXTRACTION_VERIFY.json` on run.
  """
  use ExUnit.Case, async: false

  alias OpalCore.Intelligence.Extractor

  @corpus_rel "shots/intelligence/extraction_corpus.json"
  @verify_rel "shots/intelligence/EXTRACTION_VERIFY.json"
  @precision_floor 0.90
  @committing ~w(plan.propose plan.confirm booking_request set_reminder)

  setup_all do
    root = repo_root()
    corpus_path = Path.join(root, @corpus_rel)
    assert File.exists?(corpus_path), "missing corpus at #{corpus_path}"

    {:ok, raw} = File.read(corpus_path)
    {:ok, corpus} = Jason.decode(raw)

    {:ok, root: root, corpus: corpus, corpus_path: corpus_path}
  end

  test "messy corpus ≥90% precision people/times/intents; adversarial zero false commitments",
       %{root: root, corpus: corpus, corpus_path: corpus_path} do
    convos = corpus["conversations"] || []
    messy = Enum.filter(convos, &(&1["kind"] == "messy"))
    adv = Enum.filter(convos, &(&1["kind"] == "adversarial"))

    assert length(messy) == 50
    assert length(adv) == 10

    messy_rows = Enum.map(messy, &score_row/1)
    adv_rows = Enum.map(adv, &score_row/1)

    people = aggregate(messy_rows, :people)
    times = aggregate(messy_rows, :times)
    intents = aggregate_intents(messy_rows)

    false_commits =
      adv_rows
      |> Enum.filter(& &1.false_commitment)
      |> Enum.map(& &1.id)

    people_p = precision(people)
    times_p = precision(times)
    intents_p = precision(intents)

    status =
      if people_p >= @precision_floor and times_p >= @precision_floor and
           intents_p >= @precision_floor and false_commits == [] do
        "PASS"
      else
        "FAIL"
      end

    verify = %{
      "suite" => "EXTRACTION_VERIFY",
      "paste" => "H",
      "phase" => "4_EXTRACTION_UNDER_FIRE",
      "scope" => "single-user",
      "date" => Date.utc_today() |> Date.to_iso8601(),
      "extractor_path" => "rules_floor",
      "extractor_fn" => "OpalCore.Intelligence.Extractor.classify_message/1",
      "note" =>
        "Deterministic rules-floor scoring. LLM (LlmExtract) disabled for Mix pressure; production still prefers LLM when ready with rules fallback.",
      "corpus_path" => @corpus_rel,
      "corpus_absolute" => corpus_path,
      "corpus_counts" => %{"messy" => length(messy), "adversarial" => length(adv)},
      "precision_floor" => @precision_floor,
      "committing_intents" => @committing,
      "scores" => %{
        "messy" => %{
          "people" => metric_map(people, people_p),
          "times" => metric_map(times, times_p),
          "intents" => metric_map(intents, intents_p)
        },
        "adversarial" => %{
          "false_commitments" => length(false_commits),
          "false_commitment_ids" => false_commits,
          "zero_false_commitments" => false_commits == []
        }
      },
      "messy_failures" => Enum.filter(messy_rows, &(&1.intent_ok == false)) |> Enum.map(&summarize/1),
      "adversarial_rows" => Enum.map(adv_rows, &summarize/1),
      "status" => status
    }

    verify_path = Path.join(root, @verify_rel)
    File.mkdir_p!(Path.dirname(verify_path))
    File.write!(verify_path, Jason.encode!(verify, pretty: true) <> "\n")

    assert people_p >= @precision_floor,
           "people precision #{people_p} < #{@precision_floor} (see #{@verify_rel})"

    assert times_p >= @precision_floor,
           "times precision #{times_p} < #{@precision_floor} (see #{@verify_rel})"

    assert intents_p >= @precision_floor,
           "intents precision #{intents_p} < #{@precision_floor} (see #{@verify_rel})"

    assert false_commits == [],
           "adversarial false commitments: #{inspect(false_commits)}"
  end

  defp score_row(row) do
    text = row["text"]
    exp = row["expected"] || %{}
    {intent, ents, _vibe} = Extractor.classify_message(text)

    pred_people = people_from(ents)
    pred_times = times_from(ents)
    pred_places = places_from(ents)

    exp_people = normalize_list(exp["people"])
    exp_times = normalize_list(exp["times"])
    exp_places = normalize_list(exp["places"])
    exp_intent = exp["intent"]
    should_commit = exp["should_commit"] == true

    people_tp_fp_fn = set_score(pred_people, exp_people)
    times_tp_fp_fn = set_score(pred_times, exp_times)
    places_tp_fp_fn = set_score(pred_places, exp_places)

    intent_ok = intent == exp_intent
    intent_tp = if intent_ok, do: 1, else: 0
    intent_fp = if intent_ok, do: 0, else: 1

    committed = Extractor.may_commit?(intent, ents) or intent in @committing
    # False commitment: adversarial (should_commit false) but extractor would commit
    false_commitment = row["kind"] == "adversarial" and not should_commit and committed

    %{
      id: row["id"],
      kind: row["kind"],
      trap: row["trap"],
      text: text,
      expected_intent: exp_intent,
      predicted_intent: intent,
      intent_ok: intent_ok,
      should_commit: should_commit,
      may_commit: committed,
      false_commitment: false_commitment,
      people: people_tp_fp_fn,
      times: times_tp_fp_fn,
      places: places_tp_fp_fn,
      pred_people: pred_people,
      pred_times: pred_times,
      pred_places: pred_places,
      intent_tp: intent_tp,
      intent_fp: intent_fp
    }
  end

  defp people_from(ents) do
    cond do
      is_list(ents["people"]) -> normalize_list(ents["people"])
      is_binary(ents["person"]) and ents["person"] != "" -> [String.downcase(ents["person"])]
      true -> []
    end
  end

  defp places_from(ents) do
    cond do
      is_list(ents["places"]) -> normalize_list(ents["places"])
      is_binary(ents["place"]) and ents["place"] != "" -> [String.downcase(ents["place"])]
      true -> []
    end
  end

  defp times_from(ents) do
    t = ents["time"]
    when_expr = ents["when"]

    labels =
      cond do
        is_list(ents["times"]) ->
          normalize_list(ents["times"])

        is_map(t) ->
          tonight? = t["day"] in ["today", "tonight"] or t["part"] == "evening"

          after_label =
            case t["after"] do
              nil -> nil
              n -> "after #{n}" |> String.replace(~r/^after 0+(\d)/, "after \\1")
            end

          base =
            if tonight? do
              ["tonight", t["relative"], after_label, t["time"], t["label"]]
            else
              [t["day"], t["part"], t["relative"], after_label, t["time"], t["label"]]
            end

          base
          |> Enum.reject(&is_nil/1)
          |> normalize_list()

        is_binary(t) and t != "" ->
          [String.downcase(t)]

        true ->
          []
      end

    when_labels =
      if is_binary(when_expr) and when_expr != "", do: [String.downcase(when_expr)], else: []

    Enum.uniq(labels ++ when_labels)
  end

  defp normalize_list(nil), do: []

  defp normalize_list(list) when is_list(list) do
    list
    |> Enum.map(&to_string/1)
    |> Enum.map(&String.downcase/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq()
  end

  defp normalize_list(bin) when is_binary(bin), do: normalize_list([bin])
  defp normalize_list(_), do: []

  defp set_score(pred, exp) do
    # Soft match: exact or either side contains the other ("after 10" ↔ "after 10")
    exp_unmatched =
      Enum.reject(exp, fn e ->
        Enum.any?(pred, fn p -> p == e or String.contains?(p, e) or String.contains?(e, p) end)
      end)

    pred_unmatched =
      Enum.reject(pred, fn p ->
        Enum.any?(exp, fn e -> p == e or String.contains?(p, e) or String.contains?(e, p) end)
      end)

    %{tp: length(exp) - length(exp_unmatched), fp: length(pred_unmatched), fn: length(exp_unmatched)}
  end

  defp aggregate(rows, key) do
    Enum.reduce(rows, %{tp: 0, fp: 0, fn: 0}, fn row, acc ->
      m = Map.fetch!(row, key)
      %{tp: acc.tp + m.tp, fp: acc.fp + m.fp, fn: acc.fn + m.fn}
    end)
  end

  defp aggregate_intents(rows) do
    Enum.reduce(rows, %{tp: 0, fp: 0, fn: 0}, fn row, acc ->
      %{
        tp: acc.tp + row.intent_tp,
        fp: acc.fp + row.intent_fp,
        # miss counts as FN when expected present
        fn: acc.fn + if(row.intent_ok, do: 0, else: 1)
      }
    end)
  end

  defp precision(%{tp: tp, fp: fp}) when tp + fp == 0, do: 1.0
  defp precision(%{tp: tp, fp: fp}), do: tp / (tp + fp)

  defp recall(%{tp: tp, fn: fn_}) when tp + fn_ == 0, do: 1.0
  defp recall(%{tp: tp, fn: fn_}), do: tp / (tp + fn_)

  defp metric_map(m, p) do
    %{
      "tp" => m.tp,
      "fp" => m.fp,
      "fn" => m.fn,
      "precision" => Float.round(p * 1.0, 4),
      "recall" => Float.round(recall(m) * 1.0, 4)
    }
  end

  defp summarize(row) do
    %{
      "id" => row.id,
      "trap" => row.trap,
      "text" => row.text,
      "expected_intent" => row.expected_intent,
      "predicted_intent" => row.predicted_intent,
      "intent_ok" => row.intent_ok,
      "may_commit" => row.may_commit,
      "false_commitment" => row.false_commitment,
      "pred_people" => row.pred_people,
      "pred_times" => row.pred_times,
      "pred_places" => row.pred_places
    }
  end

  defp repo_root do
    # test file: apps/opal_core/test/opal_core/intelligence/ → worktree root
    Path.expand("../../../../../", __DIR__)
  end
end
