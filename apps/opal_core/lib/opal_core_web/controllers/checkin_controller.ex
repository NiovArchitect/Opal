defmodule OpalCoreWeb.CheckinController do
  @moduledoc """
  Repair #18 B3 - circle check-in sweep HTTP surface.

  Session discipline mirrors ProfileGapController: the actor is
  ALWAYS the session user (`conn.assigns.current_user_id`). A create
  names its organizer implicitly; a respond is authored by the
  session member - any `member_user_id` in the body is ignored by
  construction (the context never reads it), matching the
  user_override_rejected convention of the group-option channel
  handler.

  Routes (router.ex, beside the profile-gaps routes):
    POST /checkins                  create or return the open sweep
    GET  /checkins/for-source       circle surface row + S2 suggestion
    GET  /checkins/:id              organizer summary or member view
    POST /checkins/:id/respond      structured answer / decline / pass
    POST /checkins/:id/close        organizer closes
    POST /checkins/:id/withdraw     member erases their answer
    POST /checkins/suggest-dismiss  permanent S2 dismissal

  Every read renders the ONE projection from
  `OpalCore.SocialFlow.Checkin.summary_for/2`; this layer derives
  nothing. Invalid input is a 422 that stores nothing.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.{Checkin, CheckinSuggestion}

  # -- create ---------------------------------------------------------------

  def create(conn, params) do
    organizer_id = conn.assigns.current_user_id

    with {:ok, source} <- source_params(params),
         {:ok, idempotency_key} <- idempotency_key(params) do
      opts = [
        idempotency_key: idempotency_key,
        prompt_theme: params["prompt_theme"],
        expires_in_hours: params["expires_in_hours"]
      ]

      case Checkin.create_sweep(organizer_id, source, opts) do
        {:ok, sweep, :created} ->
          conn
          |> put_status(201)
          |> json(%{"checkin" => projection(sweep, organizer_id), "created" => true})

        {:ok, sweep, :already_open} ->
          json(conn, %{"checkin" => projection(sweep, organizer_id), "already_open" => true})

        {:error, :sweep_quiet_window, next} ->
          conn
          |> put_status(422)
          |> json(%{
            "error_code" => "sweep_quiet_window",
            "reason" => "sweep_quiet_window",
            "next_sweep_allowed_at" => DateTime.to_iso8601(next)
          })

        {:error, reason} ->
          error(conn, reason)
      end
    else
      {:error, reason} -> error(conn, reason)
    end
  end

  # -- read -----------------------------------------------------------------

  def show(conn, %{"id" => id}) do
    viewer_id = conn.assigns.current_user_id

    case Checkin.summary_for(id, viewer_id) do
      {:ok, %{"view" => view} = projection} ->
        json(conn, %{"checkin" => projection, "view" => view})

      {:error, :not_found} ->
        not_found(conn)
    end
  end

  def for_source(conn, params) do
    organizer_id = conn.assigns.current_user_id

    with {:ok, source} <- source_params(params) do
      case Checkin.for_source(organizer_id, source) do
        {:ok, sweep, _circle_key} ->
          json(conn, %{
            "checkin" => sweep && projection(sweep, organizer_id),
            "suggestion" => CheckinSuggestion.surface_suggestion(organizer_id, source),
            "next_sweep_allowed_at" =>
              case sweep do
                nil -> nil
                s -> s |> Checkin.summary_for(organizer_id) |> sweep_next_allowed()
              end
          })

        {:error, reason} ->
          error(conn, reason)
      end
    else
      {:error, reason} -> error(conn, reason)
    end
  end

  # -- respond / close / withdraw -------------------------------------------

  def respond(conn, %{"id" => id} = params) do
    member_id = conn.assigns.current_user_id

    case Checkin.respond(id, member_id, params) do
      {:ok, _row} ->
        case Checkin.summary_for(id, member_id) do
          {:ok, projection} -> json(conn, %{"responded" => true, "checkin" => projection})
          _ -> json(conn, %{"responded" => true})
        end

      {:error, :not_found} ->
        not_found(conn)

      {:error, :sweep_closed} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "sweep_closed",
          "reason" => "sweep_closed",
          "message" =>
            "This check-in closed - message the organizer directly if you still need something."
        })

      {:error, reason} ->
        error(conn, reason)
    end
  end

  def close(conn, %{"id" => id}) do
    organizer_id = conn.assigns.current_user_id

    case Checkin.close_sweep(id, organizer_id) do
      {:ok, sweep} ->
        json(conn, %{"checkin" => projection(sweep, organizer_id), "closed" => true})

      {:error, :not_found} ->
        not_found(conn)

      {:error, reason} ->
        error(conn, reason)
    end
  end

  def withdraw(conn, %{"id" => id}) do
    member_id = conn.assigns.current_user_id

    case Checkin.withdraw(id, member_id) do
      {:ok, _row} -> json(conn, %{"withdrawn" => true})
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> error(conn, reason)
    end
  end

  def suggest_dismiss(conn, params) do
    organizer_id = conn.assigns.current_user_id

    with {:ok, source} <- source_params(params) do
      case CheckinSuggestion.dismiss(organizer_id, source) do
        {:ok, _} -> json(conn, %{"dismissed" => true})
        {:error, reason} -> error(conn, reason)
      end
    else
      {:error, reason} -> error(conn, reason)
    end
  end

  # -- params -----------------------------------------------------------------

  # Source kinds mirror the design: conversation | plan |
  # family_context | relationship_set. ref ids must be UUIDs;
  # anything else fails closed with a 422 and stores nothing.
  defp source_params(params) do
    kind = params["source_kind"] || params["kind"]

    cond do
      kind in ~w(conversation plan family_context) ->
        case uuid(params["source_ref_id"] || params["ref_id"]) do
          {:ok, ref} -> {:ok, %{"kind" => kind, "ref_id" => ref}}
          :error -> {:error, :invalid_source}
        end

      kind == "relationship_set" ->
        filter = params["source_filter"] || params["filter"] || %{}

        if is_map(filter),
          do: {:ok, %{"kind" => kind, "filter" => filter}},
          else: {:error, :invalid_source}

      true ->
        {:error, :invalid_source}
    end
  end

  defp idempotency_key(params) do
    case params["idempotency_key"] do
      key when is_binary(key) and key != "" -> {:ok, key}
      _ -> {:error, :idempotency_key_required}
    end
  end

  defp uuid(id) when is_binary(id) do
    case Ecto.UUID.cast(id) do
      {:ok, uuid} -> {:ok, uuid}
      :error -> :error
    end
  end

  defp uuid(_), do: :error

  defp projection(sweep, viewer_id) do
    case Checkin.summary_for(sweep.id, viewer_id) do
      {:ok, projection} -> projection
      _ -> nil
    end
  end

  defp sweep_next_allowed({:ok, %{"sweep" => sweep}}), do: sweep["next_sweep_allowed_at"]
  defp sweep_next_allowed(_), do: nil

  # -- errors -------------------------------------------------------------------

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found", "reason" => "not_found"})
  end

  defp error(conn, reason) do
    {status, code} =
      case reason do
        :not_a_member -> {422, "not_a_member"}
        :no_targets -> {422, "no_targets"}
        :circle_too_large -> {422, "circle_too_large"}
        :invalid_source -> {422, "invalid_source"}
        :invalid_expiry -> {422, "invalid_expiry"}
        :idempotency_key_required -> {422, "idempotency_key_required"}
        :invalid_okay -> {422, "invalid_okay"}
        :invalid_coords -> {422, "invalid_coords"}
        :not_found -> {404, "not_found"}
        {:invalid, _} -> {422, "invalid"}
        _ -> {422, "invalid"}
      end

    conn |> put_status(status) |> json(%{"error_code" => code, "reason" => code})
  end
end
