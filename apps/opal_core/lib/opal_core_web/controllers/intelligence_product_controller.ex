defmodule OpalCoreWeb.IntelligenceProductController do
  @moduledoc """
  Paste F — product HTTP facade for intelligence surfaces.

  All routes under authenticated `product_auth` → `/api/v1/product/intelligence/...`.
  Logic stays in `OpalCore.Intelligence.ProductSurface` + existing owner modules.
  Privacy: foreign resources return **404** (never 403).

  ## Inventory (BLOCKED mock → owner module → route)

  | BLOCKED mock | Method + path | Owner module(s) |
  |---|---|---|
  | Person memory GET | `GET /intelligence/people/:person_id/memory` | `SocialMemory` / `PersonMemory` / `Recall` / `TemporalAnchor` / `Routine` / `OutcomeSignal` / `RelationshipBehaviorProfile` |
  | Person fact Correct | `PATCH /intelligence/people/:person_id/facts/:key` | `PersonMemory` (known_facts) + provenance `stated` |
  | Person fact Remove | `DELETE /intelligence/people/:person_id/facts/:key` (`confirm=true`) | archive fact (`archived_at`) via `PersonMemory` |
  | Fact confirm/wrong | `POST /intelligence/people/:person_id/facts/:key/confirm` | provenance transition on `PersonMemory` |
  | Mediation list | `GET /intelligence/mediation` | `GroupDecision` / `GroupCoordinator` / `GroupDecisionState` |
  | Mediation by id | `GET /intelligence/mediation/:id` | same |
  | Mediation by convo | `GET /intelligence/groups/:conversation_id/mediation` | same (conversation-scoped alias) |
  | Mediation send | `POST /intelligence/mediation/:id/send` | `GroupCoordinator` owner_draft + **outbox** |
  | Mediation dismiss | `POST /intelligence/mediation/:id/dismiss` | `GroupDecision.dismiss_mediation/2` |
  | Mediation create_plan | `POST /intelligence/mediation/:id/create_plan` | consensus → SharedPlan create path |
  | Briefing current | `GET /intelligence/briefings?current=1` | `WeeklyBriefing` / `WeeklyBriefingWorker` |
  | Briefing past | `GET /intelligence/briefings` | `WeeklyBriefing` |
  | Briefing by id | `GET /intelligence/briefings/:id` | `WeeklyBriefing` |
  | Briefing dismiss | `POST /intelligence/briefings/:id/dismiss` | dismiss-for-week on `WeeklyBriefing` |
  | Attention enrichment | fields on `GET /attention` | `AttentionCenter` + `TemporalAnchor` + `SurfacedNudge` + AttentionBudget slots |
  | Channel `group_blocked` | broadcast | `BroadcastChoreography` + `GroupCoordinator` — **owner** `user:` (Paste C) |
  | Channel `group_consensus` | broadcast | same — owner `user:` |
  | Channel `weekly_briefing` | broadcast | `WeeklyBriefingWorker` — owner `user:` |
  | Channel `temporal_anchor` | broadcast | temporal nudge path / MemoryHourlyWorker — owner `user:` |

  Contract owner for payload shapes: `apps/opal_web/src/api/intelligenceClient.ts`.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Intelligence.{OnboardingCopy, ProductSurface}

  # --- Onboarding spoken copy (LLM + template floor) ---

  def onboarding_copy(conn, params) do
    account_id = conn.assigns.current_user_id

    case OnboardingCopy.draft(account_id, params) do
      {:ok, %{text: text, source: source}} ->
        json(conn, %{"text" => text, "source" => source})

      {:error, :legal_template_only} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "legal_template_only"})

      {:error, :unknown_moment} ->
        conn |> put_status(422) |> json(%{"error_code" => "unknown_moment"})

      {:error, :template_required} ->
        conn |> put_status(422) |> json(%{"error_code" => "template_required"})

      {:error, reason} ->
        conn |> put_status(422) |> json(%{"error_code" => inspect(reason)})
    end
  end

  # --- Person memory (F1) ---

  def person_memory(conn, %{"person_id" => person_id}) do
    account_id = conn.assigns.current_user_id

    case ProductSurface.get_person_memory(account_id, person_id) do
      {:ok, view} -> json(conn, view)
      {:error, :not_found} -> not_found(conn)
    end
  end

  def patch_fact(conn, %{"person_id" => person_id, "key" => key} = params) do
    account_id = conn.assigns.current_user_id
    value = params["value"]
    source_note = params["source_note"]

    cond do
      not is_binary(value) or String.trim(value) == "" ->
        conn |> put_status(422) |> json(%{"error_code" => "value_required"})

      true ->
        case ProductSurface.patch_fact(account_id, person_id, key, value,
               source_note: source_note || "corrected by owner"
             ) do
          {:ok, fact} -> json(conn, %{"fact" => fact})
          {:error, :not_found} -> not_found(conn)
          {:error, reason} -> conn |> put_status(422) |> json(%{"error_code" => inspect(reason)})
        end
    end
  end

  def delete_fact(conn, %{"person_id" => person_id, "key" => key} = params) do
    account_id = conn.assigns.current_user_id
    confirm = params["confirm"]

    case ProductSurface.delete_fact(account_id, person_id, key, confirm) do
      {:ok, result} ->
        json(conn, Map.merge(%{"deleted" => true}, stringify_keys(result)))

      {:error, :confirm_required} ->
        conn |> put_status(422) |> json(%{"error_code" => "confirm_required"})

      {:error, :not_found} ->
        not_found(conn)

      {:error, reason} ->
        conn |> put_status(422) |> json(%{"error_code" => inspect(reason)})
    end
  end

  def confirm_fact(conn, %{"person_id" => person_id, "key" => key} = params) do
    account_id = conn.assigns.current_user_id
    action = params["action"]

    case ProductSurface.confirm_fact(account_id, person_id, key, action) do
      {:ok, fact} -> json(conn, %{"fact" => fact})
      {:error, :not_found} -> not_found(conn)
      {:error, :invalid_action} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid_action"})

      {:error, reason} ->
        conn |> put_status(422) |> json(%{"error_code" => inspect(reason)})
    end
  end

  # --- Mediation (F2) ---

  def list_mediation(conn, _params) do
    account_id = conn.assigns.current_user_id

    case ProductSurface.list_mediation(account_id) do
      {:ok, items} -> json(conn, %{"items" => items})
      _ -> json(conn, %{"items" => []})
    end
  end

  def show_mediation(conn, %{"id" => id}) do
    account_id = conn.assigns.current_user_id

    case ProductSurface.get_mediation(account_id, id) do
      {:ok, item} -> json(conn, item)
      {:error, :not_found} -> not_found(conn)
    end
  end

  def show_group_mediation(conn, %{"conversation_id" => conversation_id}) do
    account_id = conn.assigns.current_user_id

    case ProductSurface.get_mediation_by_conversation(account_id, conversation_id) do
      {:ok, item} -> json(conn, item)
      {:error, :not_found} -> not_found(conn)
    end
  end

  def send_mediation(conn, %{"id" => id} = params) do
    account_id = conn.assigns.current_user_id
    draft = params["draft"]

    case ProductSurface.send_mediation(account_id, id, draft) do
      {:ok, result} ->
        json(conn, %{
          "ok" => true,
          "delivered_via" => "owner_draft",
          "card_state" => "sent",
          "item" => result[:item] || result["item"]
        })

      {:error, :not_found} ->
        not_found(conn)

      {:error, reason} ->
        conn |> put_status(422) |> json(%{"error_code" => inspect(reason)})
    end
  end

  def dismiss_mediation(conn, %{"id" => id}) do
    account_id = conn.assigns.current_user_id

    case ProductSurface.dismiss_mediation(account_id, id) do
      {:ok, item} -> json(conn, %{"ok" => true, "card_state" => "dismissed", "item" => item})
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> conn |> put_status(422) |> json(%{"error_code" => inspect(reason)})
    end
  end

  def create_plan_mediation(conn, %{"id" => id} = params) do
    account_id = conn.assigns.current_user_id

    case ProductSurface.create_plan_from_mediation(account_id, id, params) do
      {:ok, result} ->
        conn |> put_status(201) |> json(Map.put(result, "ok", true))

      {:error, :not_found} ->
        not_found(conn)

      {:error, :not_reached} ->
        # Still return lock-in prefill when consensus isn't reached yet
        case ProductSurface.lock_in_plan(account_id, id) do
          {:ok, payload} -> json(conn, Map.merge(payload, %{"ok" => true, "created" => false}))
          {:error, :not_found} -> not_found(conn)
          {:error, reason} -> conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
        end

      {:error, reason} ->
        conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
    end
  end

  # --- Briefings (F3) ---

  def list_briefings(conn, params) do
    account_id = conn.assigns.current_user_id

    if truthy?(params["current"]) do
      case ProductSurface.current_briefing(account_id) do
        {:ok, briefing} ->
          json(conn, %{"briefing" => briefing})

        {:error, :not_found, meta} ->
          conn
          |> put_status(404)
          |> json(Map.merge(%{"error_code" => "not_found"}, meta))

        {:error, :dismissed, meta} ->
          conn
          |> put_status(404)
          |> json(Map.merge(%{"error_code" => "not_found"}, meta))
      end
    else
      case ProductSurface.list_past_briefings(account_id) do
        {:ok, briefings} -> json(conn, %{"briefings" => briefings})
        _ -> json(conn, %{"briefings" => []})
      end
    end
  end

  def show_briefing(conn, %{"id" => id}) do
    account_id = conn.assigns.current_user_id

    case ProductSurface.get_briefing(account_id, id) do
      {:ok, briefing} -> json(conn, %{"briefing" => briefing})
      {:error, :not_found} -> not_found(conn)
    end
  end

  def dismiss_briefing(conn, %{"id" => id}) do
    account_id = conn.assigns.current_user_id

    case ProductSurface.dismiss_briefing(account_id, id) do
      {:ok, briefing} -> json(conn, %{"ok" => true, "briefing" => briefing})
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> conn |> put_status(422) |> json(%{"error_code" => inspect(reason)})
    end
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end

  defp truthy?(v) when v in [true, "true", "1", 1], do: true
  defp truthy?(_), do: false

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify_keys(other), do: other
end
