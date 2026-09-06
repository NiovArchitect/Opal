defmodule OpalCoreWeb.DecisionIntelligenceController do
  @moduledoc """
  Thin authenticated product API for Decision Intelligence cold-start (P4.6).

  Shareable projection only — no private evidence / budget blame.
  """
  use OpalCoreWeb, :controller

  alias OpalCore.DecisionIntelligence

  @doc """
  POST /api/v1/product/decisions/resolve

  Body: intent, lat, lng, area_label?, scope_type?, place_provider_mode?
  """
  def resolve(conn, params) do
    user_id = conn.assigns.current_user_id
    params = stringify(params)

    intent = params["intent"] || "nearby_now"
    scope_type = params["scope_type"] || "solo"
    lat = number(params["lat"])
    lng = number(params["lng"])
    area_label = params["area_label"]
    force_connected = params["place_provider_mode"] in ["connected", "openstreetmap"]

    location_context =
      %{}
      |> maybe_put("lat", lat)
      |> maybe_put("lng", lng)
      |> maybe_put("area_label", area_label)

    create_attrs = %{
      "intent" => intent,
      "scope_type" => scope_type,
      "participant_ids" => [user_id],
      "location_context" => location_context,
      "budget_context" => params["budget_context"] || %{},
      "time_context" => params["time_context"] || %{},
      "preference_context" => params["preference_context"] || %{},
      "soft_preferences" => params["soft_preferences"] || %{},
      "hard_constraints" => params["hard_constraints"] || %{},
      "idempotency_key" => params["idempotency_key"]
    }

    use_connected = force_connected or (is_number(lat) and is_number(lng))

    with_place_mode(use_connected, fn ->
      case DecisionIntelligence.create_context(user_id, create_attrs) do
        {:ok, %{context: ctx}} ->
          case DecisionIntelligence.resolve(ctx.id, user_id, %{
                 "expected_context_revision" => ctx.revision,
                 "idempotency_key" => params["resolve_idempotency_key"]
               }) do
            {:ok, payload} ->
              json(conn, shareable_resolve(payload, ctx))

            {:error, reason} ->
              error(conn, status_for(reason), error_code(reason), human_error(reason))
          end

        {:error, %Ecto.Changeset{} = cs} ->
          error(conn, 422, "invalid_context", inspect(cs.errors))

        {:error, reason} ->
          error(conn, 422, "create_failed", inspect(reason))
      end
    end)
  end

  @doc "POST /api/v1/product/decisions/:id/answer_question"
  def answer_question(conn, %{"id" => result_id} = params) do
    user_id = conn.assigns.current_user_id
    params = stringify(params)

    case DecisionIntelligence.answer_question(result_id, user_id, %{
           "choice_id" => params["choice_id"]
         }) do
      {:ok, payload} ->
        json(conn, shareable_followup(payload))

      {:error, :stale_question, superseded} ->
        conn
        |> put_status(:conflict)
        |> json(%{
          "error_code" => "stale_question",
          "message" => "Question was superseded",
          "decision" => shareable_result(superseded)
        })

      {:error, reason} ->
        error(conn, status_for(reason), error_code(reason), human_error(reason))
    end
  end

  @doc "POST /api/v1/product/decisions/:id/resolve_tradeoff"
  def resolve_tradeoff(conn, %{"id" => result_id} = params) do
    user_id = conn.assigns.current_user_id
    params = stringify(params)

    case DecisionIntelligence.resolve_tradeoff(result_id, user_id, %{
           "selected_id" => params["selected_id"]
         }) do
      {:ok, payload} ->
        json(conn, shareable_followup(payload))

      {:error, :stale_tradeoff, superseded} ->
        conn
        |> put_status(:conflict)
        |> json(%{
          "error_code" => "stale_tradeoff",
          "message" => "Tradeoff was superseded",
          "decision" => shareable_result(superseded)
        })

      {:error, reason} ->
        error(conn, status_for(reason), error_code(reason), human_error(reason))
    end
  end

  defp with_place_mode(false, fun), do: fun.()

  defp with_place_mode(true, fun) do
    previous = %{
      mode: Application.get_env(:opal_core, :place_provider_mode),
      backend: Application.get_env(:opal_core, :place_provider_backend),
      allow: Application.get_env(:opal_core, :allow_osm_public)
    }

    Application.put_env(:opal_core, :place_provider_mode, "connected")
    Application.put_env(:opal_core, :place_provider_backend, :openstreetmap)
    Application.put_env(:opal_core, :allow_osm_public, true)

    try do
      fun.()
    after
      restore(:place_provider_mode, previous.mode)
      restore(:place_provider_backend, previous.backend)
      restore(:allow_osm_public, previous.allow)
    end
  end

  defp restore(k, nil), do: Application.delete_env(:opal_core, k)
  defp restore(k, v), do: Application.put_env(:opal_core, k, v)

  defp shareable_resolve(%{outcome: outcome, result: result, assessment: assessment}, ctx) do
    base = %{
      "decision_id" => ctx.id,
      "revision" => ctx.revision,
      "outcome" => outcome_label(outcome),
      "mode" => mode_for(outcome, result),
      "confidence_class" => confidence_for(outcome, result),
      "candidate_source" => candidate_source(result, assessment),
      "real" => real?(result, assessment),
      "provisional" => true,
      "figma" => figma_for(outcome, result)
    }

    base
    |> Map.merge(answer_fields(result))
    |> Map.merge(question_fields(result))
    |> Map.merge(tradeoff_fields(result))
    |> maybe_failure_note(outcome, assessment)
  end

  defp shareable_followup(%{outcome: outcome} = payload) do
    result = payload[:result] || payload["result"]
    ctx = payload[:context] || payload["context"]
    assessment = payload[:assessment] || payload[:followup]

    %{
      "decision_id" => (ctx && ctx.id) || (result && result.decision_id),
      "revision" => (ctx && ctx.revision) || nil,
      "outcome" => outcome_label(outcome),
      "mode" => mode_for(outcome, result),
      "confidence_class" => confidence_for(outcome, result),
      "candidate_source" => candidate_source(result, assessment),
      "real" => real?(result, assessment),
      "provisional" => true,
      "figma" => figma_for(outcome, result)
    }
    |> Map.merge(answer_fields(result))
    |> Map.merge(question_fields(result))
    |> Map.merge(tradeoff_fields(result))
  end

  defp shareable_result(result) when is_map(result) do
    %{
      "decision_id" => result.decision_id,
      "result_id" => result.id,
      "mode" => result.mode,
      "confidence_class" => result.confidence_class,
      "status" => result.status,
      "candidate_source" => result.candidate_source
    }
    |> Map.merge(answer_fields(result))
  end

  defp answer_fields(nil), do: %{"answer" => nil, "result_id" => nil}

  defp answer_fields(%{mode: "high"} = result) do
    payload = result.answer_payload || %{}

    %{
      "result_id" => result.id,
      "answer" => %{
        "entity_id" => result.answer_entity_id,
        "name" => payload["display_name"] || payload["name"],
        "area" => payload["area_label"] || payload["area"]
      },
      "actions" => result.actions || []
    }
  end

  defp answer_fields(result) do
    %{
      "result_id" => result.id,
      "answer" => nil,
      "actions" => result.actions || []
    }
  end

  defp question_fields(%{mode: "medium"} = result) do
    q = result.question_payload || %{}

    %{
      "question" => %{
        "question_id" => result.question_id || q["question_id"],
        "dimension" => result.question_dimension || q["dimension"],
        "prompt" => q["prompt"],
        "choices" => q["choices"] || result.actions || []
      }
    }
  end

  defp question_fields(_), do: %{}

  defp tradeoff_fields(%{mode: "low"} = result) do
    t = result.tradeoff_payload || %{}

    %{
      "tradeoff" => %{
        "conflict_id" => result.conflict_id || t["conflict_id"],
        "axis" => result.tradeoff_axis || t["tradeoff_axis"],
        "prompt" => t["prompt"],
        "option_a" => t["option_a"],
        "option_b" => t["option_b"]
      }
    }
  end

  defp tradeoff_fields(_), do: %{}

  defp maybe_failure_note(map, outcome, assessment)
       when outcome in ["NO_VALID_CANDIDATE", "NOT_RESOLVED", "NOT_HIGH_CONFIDENCE"] do
    reasons = (assessment && (assessment["reason_codes"] || [])) || []

    Map.put(map, "note", failure_note(outcome, reasons))
  end

  defp maybe_failure_note(map, _, _), do: map

  defp failure_note("NO_VALID_CANDIDATE", reasons) do
    if "provider_unavailable" in reasons do
      "Places are unavailable right now — try again shortly."
    else
      "Nothing nearby fits the current constraints."
    end
  end

  defp failure_note(_, _), do: "Could not settle on one answer yet."

  defp outcome_label(o) when is_binary(o), do: o
  defp outcome_label(o), do: to_string(o)

  defp mode_for("HIGH", _), do: "high"
  defp mode_for("HIGH_AFTER_ANSWER", _), do: "high"
  defp mode_for("HIGH_AFTER_TRADEOFF", _), do: "high"
  defp mode_for("MEDIUM", _), do: "medium"
  defp mode_for("LOW", _), do: "low"
  defp mode_for(_, %{mode: m}) when is_binary(m), do: m
  defp mode_for(_, _), do: "failure"

  defp confidence_for("HIGH", _), do: "high"
  defp confidence_for("HIGH_AFTER_ANSWER", _), do: "high"
  defp confidence_for("HIGH_AFTER_TRADEOFF", _), do: "high"
  defp confidence_for("MEDIUM", _), do: "medium"
  defp confidence_for("LOW", _), do: "low"
  defp confidence_for(_, %{confidence_class: c}) when is_binary(c), do: c
  defp confidence_for(_, _), do: "failure"

  defp candidate_source(nil, assessment),
    do: (assessment && assessment["candidate_source"]) || nil

  defp candidate_source(result, assessment),
    do: result.candidate_source || (assessment && assessment["candidate_source"])

  defp real?(nil, assessment), do: assessment && assessment["real"] == true

  defp real?(result, assessment) do
    src = candidate_source(result, assessment)
    src not in [nil, "fixture_catalog", "provider_error"] or (assessment && assessment["real"] == true)
  end

  defp figma_for("HIGH", _), do: %{"authority" => "979:2", "hue" => "violet"}
  defp figma_for("HIGH_AFTER_ANSWER", _), do: %{"authority" => "979:2", "hue" => "violet"}
  defp figma_for("HIGH_AFTER_TRADEOFF", _), do: %{"authority" => "979:2", "hue" => "violet"}
  defp figma_for("MEDIUM", _), do: %{"authority" => "988:2", "hue" => "violet"}
  defp figma_for("LOW", _), do: %{"authority" => "988:263", "hue" => "violet"}
  defp figma_for(_, _), do: %{"authority" => "618:902", "hue" => "violet"}

  defp status_for(:not_found), do: 404
  defp status_for(:forbidden), do: 403
  defp status_for(:stale_decision_revision), do: 409
  defp status_for(:stale_question), do: 409
  defp status_for(:stale_tradeoff), do: 409
  defp status_for(:expected_context_revision_required), do: 422
  defp status_for(_), do: 422

  defp error_code(atom) when is_atom(atom), do: Atom.to_string(atom)
  defp error_code(other), do: "decision_failed_#{inspect(other)}"

  defp human_error(:not_found), do: "Decision not found"
  defp human_error(:forbidden), do: "Not allowed"
  defp human_error(:stale_decision_revision), do: "Decision changed — refresh and try again"
  defp human_error(:question_not_open), do: "That question is no longer open"
  defp human_error(:tradeoff_not_open), do: "That tradeoff is no longer open"
  defp human_error(:invalid_choice), do: "Invalid choice"
  defp human_error(:invalid_selection), do: "Invalid selection"
  defp human_error(other), do: inspect(other)

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_val(v)}
      {k, v} -> {to_string(k), stringify_val(v)}
    end)
  end

  defp stringify_val(list) when is_list(list), do: Enum.map(list, &stringify_val/1)
  defp stringify_val(map) when is_map(map), do: stringify(map)
  defp stringify_val(v), do: v

  defp number(n) when is_number(n), do: n

  defp number(n) when is_binary(n) do
    case Float.parse(n) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp number(_), do: nil

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, k, v), do: Map.put(map, k, v)
end
