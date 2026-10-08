defmodule OpalCore.Intelligence.FeedbackLoop do
  @moduledoc """
  Close the loop: accept / dismiss / ignore → vibe confidence + queryable feedback.
  """

  import Ecto.Query

  alias OpalCore.Intelligence.Feedback
  alias OpalCore.Intelligence.OutcomeLearning
  alias OpalCore.Repo
  alias OpalCore.Trips.VibeProfile
  alias OpalCore.Trips.VibeProfiles

  @doc """
  Record feedback on a decision/action.

  signal: accepted | dismissed | ignored | counter_proposed
  """
  def record(attrs) when is_map(attrs) do
    actor_id = Map.get(attrs, :actor_id) || Map.get(attrs, "actor_id")
    signal = Map.get(attrs, :signal) || Map.get(attrs, "signal")

    with true <- is_binary(actor_id),
         true <- signal in ~w(accepted dismissed ignored counter_proposed),
         {:ok, row} <-
           %Feedback{}
           |> Feedback.changeset(%{
             actor_id: actor_id,
             signal: signal,
             decision_id: Map.get(attrs, :decision_id) || Map.get(attrs, "decision_id"),
             action_id: Map.get(attrs, :action_id) || Map.get(attrs, "action_id"),
             detail: Map.get(attrs, :detail) || Map.get(attrs, "detail") || %{}
           })
           |> Repo.insert() do
      _ = apply_vibe_delta(actor_id, signal, row.detail)
      _ = capture_outcome_signal(actor_id, signal, row)
      {:ok, row}
    else
      false -> {:error, :invalid_attrs}
      {:error, _} = err -> err
    end
  end

  def record(_), do: {:error, :invalid_attrs}

  defp capture_outcome_signal(actor_id, signal, row) do
    outcome =
      case signal do
        "accepted" -> "positive"
        "dismissed" -> "negative"
        "counter_proposed" -> "negative"
        _ -> "neutral"
      end

    OutcomeLearning.record(%{
      account_id: actor_id,
      signal_type: "feedback." <> signal,
      ref_type: "feedback",
      ref_id: row.id,
      outcome: outcome,
      strength: if(outcome == "negative", do: 0.7, else: 0.85),
      context: row.detail || %{}
    })
  rescue
    _ -> :ok
  end

  @doc "List feedback for an actor (audit)."
  def list_for_actor(actor_id, opts \\ []) when is_binary(actor_id) do
    limit = Keyword.get(opts, :limit, 100)

    from(f in Feedback,
      where: f.actor_id == ^actor_id,
      order_by: [desc: f.inserted_at],
      limit: ^limit
    )
    |> Repo.all()
  end

  @doc """
  Simulate Maya always countering morning proposals → stop morning proposals.

  Returns %{morning_blocked?: boolean, evidence_count: n, feedback_ids: [...]}
  """
  def maya_morning_counter_scenario(actor_id, rounds \\ 5) when is_binary(actor_id) do
    {:ok, _} = VibeProfiles.ensure(actor_id)

    feedback_ids =
      Enum.map(1..rounds, fn i ->
        {:ok, row} =
          record(%{
            actor_id: actor_id,
            signal: "counter_proposed",
            detail: %{
              "pattern" => "morning_proposal_rejected",
              "round" => i,
              "slot" => "morning"
            }
          })

        row.id
      end)

    {:ok, profile} = VibeProfiles.get(actor_id)
    evidence = List.wrap(profile.evidence)

    morning_rejects =
      Enum.count(evidence, fn e ->
        is_map(e) and
          (e["pattern"] == "morning_proposal_rejected" or e["slot"] == "morning") and
          e["signal"] in ["counter_proposed", "dismissed", "rsvp.passed"]
      end)

    %{
      morning_blocked?: morning_rejects >= 3 or profile.sleep_bias == "late",
      evidence_count: morning_rejects,
      sleep_bias: profile.sleep_bias,
      feedback_ids: feedback_ids
    }
  end

  defp apply_vibe_delta(actor_id, signal, detail) do
    case VibeProfiles.ensure(actor_id) do
      {:ok, profile} ->
        delta =
          case signal do
            "accepted" -> 0.08
            "dismissed" -> -0.1
            "counter_proposed" -> -0.12
            "ignored" -> -0.02
            _ -> 0.0
          end

        evidence = List.wrap(profile.evidence)

        entry = %{
          "source" => "intelligence.feedback",
          "signal" => signal,
          "delta" => delta,
          "pattern" => detail["pattern"],
          "slot" => detail["slot"],
          "detail" => detail,
          "at" => DateTime.utc_now() |> DateTime.to_iso8601()
        }

        sleep =
          cond do
            signal in ["dismissed", "counter_proposed"] and detail["slot"] == "morning" ->
              "late"

            signal == "accepted" and detail["slot"] == "morning" ->
              "early"

            true ->
              profile.sleep_bias
          end

        profile
        |> VibeProfile.changeset(%{
          sleep_bias: sleep || profile.sleep_bias,
          evidence: [entry | evidence] |> Enum.take(50)
        })
        |> Repo.update()

      _ ->
        :ok
    end
  end
end
