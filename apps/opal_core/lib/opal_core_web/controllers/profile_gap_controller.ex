defmodule OpalCoreWeb.ProfileGapController do
  @moduledoc """
  Repair #16 W3 — progressive profile ask surface (Repair #15 deferred B6).

  HTTP endpoints for `OpalCore.SocialFlow.Execution.ProfileGap`, the
  ask-once mechanism shipped in Repair #15 with no live rendering:

    POST /api/v1/product/profile-gaps/assess
    POST /api/v1/product/profile-gaps/answer
    POST /api/v1/product/profile-gaps/skip

  Owner scope is strict: the owner is ALWAYS the session user
  (`conn.assigns.current_user_id`); no param can name another owner, so
  one owner can never read, answer, or skip another owner's gap. The
  `person_id` in the body names the person the fact is about (a user id
  in the owner's world) — facts stay keyed to the (owner, person, fact)
  triple inside the mechanism and its ledger.

  QUIET law at the API layer:
    * `assess` returns the mechanism result verbatim — `known` and
      `proceed_without` carry `"ask" => nil`; the surface renders
      nothing for them. The ask is never blocking (`plan_proceeds` is
      true in every birthday branch).
    * An invalid answer is a 422 and stores NOTHING — the mechanism
      leaves the ledger untouched on a rejected/invalid answer, and
      this layer adds no writes of its own.
    * `skip` is permanent and idempotent: repeat skips return the same
      success and the ledger still holds exactly one row.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.Execution.ProfileGap

  @default_fact "birthday"

  def assess(conn, params) do
    owner_id = conn.assigns.current_user_id

    with {:ok, person_id} <- person_id(params),
         {:ok, fact_key} <- fact_key(params) do
      base_opts =
        case person_name(params) do
          nil -> []
          name -> [person_name: name]
        end

      result =
        if fact_key == @default_fact do
          ProfileGap.birthday_plan_context(owner_id, person_id, [{:flow, "birthday_plan"} | base_opts])
        else
          # Generic facts: the birthday flow label must not leak into the
          # ledger's asked_in_flow for facts that aren't birthdays.
          ProfileGap.assess(owner_id, person_id, fact_key, [{:flow, "profile_gap"} | base_opts])
        end

      json(conn, %{"profile_gap" => result})
    else
      {:error, code} -> invalid(conn, code)
    end
  end

  def answer(conn, params) do
    owner_id = conn.assigns.current_user_id

    with {:ok, person_id} <- person_id(params),
         {:ok, fact_key} <- fact_key(params),
         {:ok, value} <- answer_value(params) do
      answer_opts =
        case person_name(params) do
          nil -> []
          name -> [person_name: name]
        end

      case ProfileGap.answer(owner_id, person_id, fact_key, value, answer_opts) do
        {:ok, fact} ->
          json(conn, %{
            "answered" => true,
            "fact_key" => fact_key,
            "value" => fact["value"] || value
          })

        {:error, _reason} ->
          # Invalid/rejected answers store nothing (mechanism guarantee);
          # the API layer asserts the same contract with a plain 422.
          invalid(conn, "invalid_answer")
      end
    else
      {:error, code} -> invalid(conn, code)
    end
  end

  def skip(conn, params) do
    owner_id = conn.assigns.current_user_id

    with {:ok, person_id} <- person_id(params),
         {:ok, fact_key} <- fact_key(params) do
      case ProfileGap.skip(owner_id, person_id, fact_key) do
        {:ok, _row} ->
          json(conn, %{"skipped" => true, "fact_key" => fact_key, "status" => "proceed_without"})

        {:error, _} ->
          invalid(conn, "invalid")
      end
    else
      {:error, code} -> invalid(conn, code)
    end
  end

  # --- param validation ------------------------------------------------------

  # person_id must be a real user UUID (the ledger column is binary_id);
  # anything else fails closed with a 422 instead of a DB error.
  defp person_id(params) do
    case Map.get(params, "person_id") do
      id when is_binary(id) ->
        case Ecto.UUID.cast(id) do
          {:ok, uuid} -> {:ok, uuid}
          :error -> {:error, "invalid_person"}
        end

      _ ->
        {:error, "invalid_person"}
    end
  end

  defp fact_key(params) do
    case Map.get(params, "fact_key") do
      nil -> {:ok, @default_fact}
      "" -> {:ok, @default_fact}
      key when is_binary(key) -> {:ok, key}
      _ -> {:error, "invalid_fact"}
    end
  end

  defp person_name(params) do
    case Map.get(params, "person_name") do
      name when is_binary(name) and name != "" -> name
      _ -> nil
    end
  end

  # The birthday answer may arrive as an ISO date string or a
  # {month, day, year?} map — both are shapes ProfileGap.answer/5 parses.
  # Anything else (numbers, empty strings, lists) is rejected here so a
  # garbage payload can never reach the store.
  defp answer_value(params) do
    case Map.get(params, "value") do
      value when is_binary(value) ->
        if String.trim(value) == "", do: {:error, "invalid_answer"}, else: {:ok, value}

      %{} = value ->
        {:ok, value}

      _ ->
        {:error, "invalid_answer"}
    end
  end

  defp invalid(conn, code) do
    conn |> put_status(422) |> json(%{"error_code" => "invalid", "reason" => code})
  end
end
