defmodule OpalCore.Calendar do
  @moduledoc """
  Product Calendar facade (Paste G Phase 3).

  Integrates existing `GoogleAdapter` freeBusy and adds list_events under
  `calendar.readonly`. Tokens live in `provider_connections` via TokenVault —
  no separate `calendar_tokens` table.

  Privacy / trust guarantee:
  - Free/busy is queried per request (cached ≤1 hour in ETS — busy intervals only).
  - Event titles are fetched only when a caller explicitly needs them for LLM
    context (`include_titles: true`); we never wholesale warehouse calendars.
  - Revoked / disconnected tokens surface as honest `:disconnected` / `:revoked`.
  """

  require Logger

  alias OpalCore.Calendar.FreeBusyCache
  alias OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections

  @events_url "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  @readonly_scope "https://www.googleapis.com/auth/calendar.readonly"
  @gmail_scope "https://www.googleapis.com/auth/gmail.readonly"

  @doc "Scopes requested on Google OAuth consent (calendar + gmail prep)."
  def oauth_scopes do
    [@readonly_scope, @gmail_scope]
  end

  def oauth_scope_string, do: Enum.join(oauth_scopes(), " ")

  @doc "True when google_calendar provider_connection is connected."
  def connected?(user_id) when is_binary(user_id) do
    ProviderConnections.connected?(user_id, "google_calendar")
  end

  def connected?(_), do: false

  @doc """
  Free/busy for `user_id` over `start_at`/`end_at` (DateTime or ISO8601).

  Uses cache ≤1h. Auto-refreshes access token via GoogleAdapter; revoked →
  `{:error, :disconnected}`.
  """
  def free_busy(user_id, start_at, end_at) when is_binary(user_id) do
    with {:ok, range} <- normalize_range(start_at, end_at) do
      range_key = range_cache_key(range)

      case FreeBusyCache.get(user_id, range_key) do
        {:ok, busy} ->
          {:ok, busy}

        :miss ->
          case GoogleAdapter.free_busy(user_id, range) do
            {:ok, busy} when is_list(busy) ->
              FreeBusyCache.put(user_id, range_key, busy)
              {:ok, busy}

            {:ok, %{"busy" => busy}} when is_list(busy) ->
              FreeBusyCache.put(user_id, range_key, busy)
              {:ok, busy}

            {:error, :not_connected} ->
              {:error, :disconnected}

            {:error, :permission_denied} ->
              {:error, :disconnected}

            {:error, :token_expired} ->
              # One forced refresh retry path — GoogleAdapter already refreshes on expiry;
              # surface honest disconnect if still failing.
              case retry_free_busy(user_id, range) do
                {:ok, busy} ->
                  FreeBusyCache.put(user_id, range_key, busy)
                  {:ok, busy}

                {:error, :refresh_revoked} ->
                  FreeBusyCache.invalidate(user_id)
                  {:error, :disconnected}

                other ->
                  other
              end

            other ->
              other
          end
      end
    end
  end

  def free_busy(_, _, _), do: {:error, :invalid}

  @doc """
  List events in range. Titles included only when `include_titles: true`
  (default false for planning free/busy fusion). Requires calendar.readonly.
  """
  def list_events(user_id, start_at, end_at, opts \\ [])

  def list_events(user_id, start_at, end_at, opts) when is_binary(user_id) do
    include_titles? = Keyword.get(opts, :include_titles, false)

    with {:ok, range} <- normalize_range(start_at, end_at),
         {:ok, conn} <- require_connected(user_id),
         {:ok, token} <- ensure_token(conn) do
      query =
        URI.encode_query(%{
          "timeMin" => DateTime.to_iso8601(range.start_at),
          "timeMax" => DateTime.to_iso8601(range.end_at),
          "singleEvents" => "true",
          "orderBy" => "startTime",
          "maxResults" => min(Keyword.get(opts, :max_results, 25), 50)
        })

      case http_client().get_json("#{@events_url}?#{query}", bearer: token) do
        {:ok, %{"items" => items}} when is_list(items) ->
          events =
            items
            |> Enum.map(&normalize_event(&1, include_titles?))
            |> Enum.reject(&is_nil/1)

          Logger.info(
            "calendar.list_events user=#{user_id} count=#{length(events)} titles=#{include_titles?}"
          )

          {:ok, events}

        {:ok, %{"error" => %{"code" => 401}}} ->
          case refresh_and_retry_list(user_id, conn, range, include_titles?, opts) do
            {:ok, _} = ok -> ok
            {:error, :refresh_revoked} -> {:error, :disconnected}
            other -> other
          end

        {:ok, %{"error" => %{"code" => 403}}} ->
          {:error, :permission_denied}

        {:error, _} = err ->
          err

        _ ->
          {:error, :unavailable}
      end
    end
  end

  def list_events(_, _, _, _), do: {:error, :invalid}

  @doc """
  Filter candidate DateTime slots against free/busy.

  When calendar is connected, drops busy slots. When not connected, returns
  candidates unchanged with `calendar_checked: false` — never claims a check.
  """
  def filter_free_slots(user_id, candidates, opts \\ [])

  def filter_free_slots(user_id, candidates, opts)
      when is_binary(user_id) and is_list(candidates) do
    duration_min = Keyword.get(opts, :duration_minutes, 60)

    if connected?(user_id) do
      case slot_window(candidates) do
        {:ok, start_at, end_at} ->
          case free_busy(user_id, start_at, end_at) do
            {:ok, busy} ->
              free =
                Enum.reject(candidates, fn slot ->
                  overlaps_busy?(slot, busy, duration_min)
                end)

              {:ok, %{slots: free, calendar_checked: true, connected: true}}

            {:error, :disconnected} ->
              {:ok,
               %{
                 slots: candidates,
                 calendar_checked: false,
                 connected: false,
                 note: "calendar disconnected — proposing without calendar check"
               }}

            {:error, reason} ->
              {:ok,
               %{
                 slots: candidates,
                 calendar_checked: false,
                 connected: true,
                 note: "calendar temporarily unavailable (#{inspect(reason)})"
               }}
          end

        :empty ->
          {:ok, %{slots: [], calendar_checked: true, connected: true}}
      end
    else
      {:ok,
       %{
         slots: candidates,
         calendar_checked: false,
         connected: false,
         note: "calendar not connected — proposing without claiming a calendar check"
       }}
    end
  end

  def filter_free_slots(_, _, _), do: {:error, :invalid}

  @doc "Conflict? true when proposed window overlaps busy."
  def conflicts?(user_id, start_at, end_at) when is_binary(user_id) do
    if connected?(user_id) do
      case free_busy(user_id, start_at, end_at) do
        {:ok, busy} ->
          {:ok, Enum.any?(busy, &interval_overlap?(start_at, end_at, &1))}

        {:error, :disconnected} ->
          {:ok, false, :disconnected}

        other ->
          other
      end
    else
      {:ok, false, :not_connected}
    end
  end

  # --- internals ---

  defp retry_free_busy(user_id, range) do
    case ProviderConnections.get(user_id, "google_calendar") do
      %{status: "connected"} = conn ->
        with {:ok, refresh} <- ProviderConnections.refresh_token(conn),
             true <- is_binary(refresh) and refresh != "",
             {:ok, tokens} <- GoogleAdapter.refresh_access_token(refresh),
             next_refresh <- tokens[:refresh_token] || refresh,
             {:ok, _} <-
               ProviderConnections.upsert_tokens(user_id, "google_calendar", %{
                 access_token: tokens.access_token,
                 refresh_token: next_refresh,
                 token_expires_at: tokens.token_expires_at,
                 scopes: conn.scopes,
                 metadata: conn.metadata
               }) do
          GoogleAdapter.free_busy(user_id, range)
        else
          {:error, :refresh_revoked} -> {:error, :refresh_revoked}
          false -> {:error, :disconnected}
          _ -> {:error, :token_expired}
        end

      _ ->
        {:error, :disconnected}
    end
  end

  defp refresh_and_retry_list(user_id, conn, range, include_titles?, opts) do
    with {:ok, refresh} <- ProviderConnections.refresh_token(conn),
         true <- is_binary(refresh) and refresh != "",
         {:ok, tokens} <- GoogleAdapter.refresh_access_token(refresh),
         next_refresh <- tokens[:refresh_token] || refresh,
         {:ok, _} <-
           ProviderConnections.upsert_tokens(user_id, "google_calendar", %{
             access_token: tokens.access_token,
             refresh_token: next_refresh,
             token_expires_at: tokens.token_expires_at,
             scopes: conn.scopes,
             metadata: conn.metadata
           }) do
      list_events(user_id, range.start_at, range.end_at,
        include_titles: include_titles?,
        max_results: Keyword.get(opts, :max_results, 25)
      )
    else
      {:error, :refresh_revoked} -> {:error, :refresh_revoked}
      false -> {:error, :disconnected}
      _ -> {:error, :token_expired}
    end
  end

  defp require_connected(user_id) do
    case ProviderConnections.get(user_id, "google_calendar") do
      %{status: "connected"} = c -> {:ok, c}
      %{status: "revoked"} -> {:error, :disconnected}
      %{status: "expired"} -> {:error, :disconnected}
      nil -> {:error, :disconnected}
      _ -> {:error, :disconnected}
    end
  end

  defp ensure_token(conn) do
    now = DateTime.utc_now()

    expired? =
      match?(%DateTime{}, conn.token_expires_at) and
        DateTime.compare(conn.token_expires_at, now) != :gt

    if expired? do
      with {:ok, refresh} <- ProviderConnections.refresh_token(conn),
           true <- is_binary(refresh) and refresh != "",
           {:ok, tokens} <- GoogleAdapter.refresh_access_token(refresh),
           next_refresh <- tokens[:refresh_token] || refresh,
           {:ok, _} <-
             ProviderConnections.upsert_tokens(conn.user_id, "google_calendar", %{
               access_token: tokens.access_token,
               refresh_token: next_refresh,
               token_expires_at: tokens.token_expires_at,
               scopes: conn.scopes,
               metadata: conn.metadata
             }) do
        {:ok, tokens.access_token}
      else
        {:error, :refresh_revoked} -> {:error, :disconnected}
        _ -> {:error, :disconnected}
      end
    else
      case ProviderConnections.access_token(conn) do
        {:ok, t} -> {:ok, t}
        _ -> {:error, :disconnected}
      end
    end
  end

  defp normalize_range(start_at, end_at) do
    with {:ok, s} <- to_dt(start_at),
         {:ok, e} <- to_dt(end_at) do
      {:ok, %{start_at: s, end_at: e}}
    end
  end

  defp to_dt(%DateTime{} = dt), do: {:ok, DateTime.truncate(dt, :microsecond)}

  defp to_dt(s) when is_binary(s) do
    case DateTime.from_iso8601(s) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ -> {:error, :invalid_datetime}
    end
  end

  defp to_dt(_), do: {:error, :invalid_datetime}

  defp range_cache_key(%{start_at: s, end_at: e}) do
    "#{DateTime.to_iso8601(s)}..#{DateTime.to_iso8601(e)}"
  end

  defp normalize_event(item, include_titles?) when is_map(item) do
    start_at = event_dt(item["start"])
    end_at = event_dt(item["end"])

    if is_nil(start_at) or is_nil(end_at) do
      nil
    else
      base = %{
        "start_at" => start_at,
        "end_at" => end_at,
        "id" => item["id"],
        "status" => item["status"]
      }

      if include_titles? do
        Map.put(base, "title", item["summary"] || "(busy)")
      else
        Map.put(base, "busy", true)
      end
    end
  end

  defp normalize_event(_, _), do: nil

  defp event_dt(%{"dateTime" => dt}) when is_binary(dt) do
    case DateTime.from_iso8601(dt) do
      {:ok, d, _} -> DateTime.truncate(d, :microsecond)
      _ -> nil
    end
  end

  defp event_dt(%{"date" => d}) when is_binary(d) do
    case Date.from_iso8601(d) do
      {:ok, date} -> DateTime.new!(date, ~T[00:00:00], "Etc/UTC")
      _ -> nil
    end
  end

  defp event_dt(_), do: nil

  defp slot_window([]), do: :empty

  defp slot_window(candidates) do
    dts =
      candidates
      |> Enum.map(&slot_start/1)
      |> Enum.reject(&is_nil/1)

    case dts do
      [] ->
        :empty

      list ->
        min = Enum.min(list, DateTime)
        max = Enum.max(list, DateTime)
        {:ok, min, DateTime.add(max, 2, :hour)}
    end
  end

  defp slot_start(%DateTime{} = dt), do: dt
  defp slot_start(%{"start_at" => %DateTime{} = dt}), do: dt
  defp slot_start(%{start_at: %DateTime{} = dt}), do: dt

  defp slot_start(%{"start_at" => s}) when is_binary(s) do
    case DateTime.from_iso8601(s) do
      {:ok, dt, _} -> dt
      _ -> nil
    end
  end

  defp slot_start(_), do: nil

  defp overlaps_busy?(slot, busy, duration_min) do
    case slot_start(slot) do
      nil ->
        false

      start_at ->
        end_at = DateTime.add(start_at, duration_min * 60, :second)
        Enum.any?(busy, &interval_overlap?(start_at, end_at, &1))
    end
  end

  defp interval_overlap?(start_at, end_at, busy) do
    b_start = busy_dt(busy, "start_at") || busy_dt(busy, :start_at)
    b_end = busy_dt(busy, "end_at") || busy_dt(busy, :end_at)

    if is_nil(b_start) or is_nil(b_end) do
      false
    else
      DateTime.compare(start_at, b_end) == :lt and DateTime.compare(end_at, b_start) == :gt
    end
  end

  defp busy_dt(map, key) when is_map(map) do
    case Map.get(map, key) do
      %DateTime{} = dt -> dt
      s when is_binary(s) ->
        case DateTime.from_iso8601(s) do
          {:ok, dt, _} -> dt
          _ -> nil
        end
      _ -> nil
    end
  end

  def http_client do
    Application.get_env(:opal_core, :google_calendar_events_http_client, __MODULE__.HTTP)
  end

  defmodule HTTP do
    @moduledoc false

    def get_json(url, opts) do
      headers =
        case Keyword.get(opts, :bearer) do
          nil -> [{"accept", "application/json"}]
          t -> [{"authorization", "Bearer #{t}"}, {"accept", "application/json"}]
        end

      case Req.get(url, headers: headers, receive_timeout: 10_000) do
        {:ok, %{status: status, body: body}} when status in 200..299 ->
          {:ok, decode(body)}

        {:ok, %{status: status, body: body}} when status in [401, 403] ->
          {:ok, Map.put(decode(body), "error", %{"code" => status})}

        {:ok, %{status: status, body: body}} ->
          {:error, {:http, status, body}}

        {:error, reason} ->
          {:error, {:request, reason}}
      end
    end

    defp decode(body) when is_map(body), do: body

    defp decode(body) when is_binary(body) do
      case Jason.decode(body) do
        {:ok, map} -> map
        _ -> %{}
      end
    end

    defp decode(_), do: %{}
  end
end
