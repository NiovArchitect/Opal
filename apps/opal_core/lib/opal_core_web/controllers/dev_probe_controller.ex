defmodule OpalCoreWeb.DevProbeController do
  use OpalCoreWeb, :controller

  alias OpalCore.AI.EventProbe
  alias OpalCore.Fixtures

  def events(conn, _params) do
    if EventProbe.enabled?() do
      # Ensure probe is subscribed to seeded synthetic user topics.
      EventProbe.subscribe_user(Fixtures.user_alex_id())
      EventProbe.subscribe_user(Fixtures.user_jordan_id())
      EventProbe.subscribe_user(Fixtures.user_taylor_id())

      json(conn, %{
        "enabled" => true,
        "events" => EventProbe.events(),
        "ai_client" => inspect(Application.get_env(:opal_core, :ai_client))
      })
    else
      conn
      |> put_status(404)
      |> json(%{"error_code" => "not_found", "message" => "event probe disabled"})
    end
  end

  def reset_events(conn, _params) do
    if EventProbe.enabled?() do
      EventProbe.reset()
      json(conn, %{"ok" => true})
    else
      conn
      |> put_status(404)
      |> json(%{"error_code" => "not_found", "message" => "event probe disabled"})
    end
  end

  def client_info(conn, _params) do
    json(conn, %{
      "ai_client" => inspect(Application.get_env(:opal_core, :ai_client)),
      "ai_service_url" => Application.get_env(:opal_core, :ai_service_url),
      "dev_auth_enabled" => Application.get_env(:opal_core, :dev_auth_enabled, false),
      "event_probe_enabled" => Application.get_env(:opal_core, :event_probe_enabled, false)
    })
  end

  # --- Repair #18 staging seams (dev_auth scope only; production has
  # dev_auth disabled, so these routes are unreachable there) ---

  @doc "Pin or clear the canonical server clock (Clock app-env override seam)."
  def set_clock(conn, params) do
    cond do
      params["clear"] == true ->
        Application.delete_env(:opal_core, :clock_override)
        json(conn, %{"ok" => true, "clock" => "real"})

      is_binary(params["iso"]) ->
        case DateTime.from_iso8601(params["iso"]) do
          {:ok, dt, _} ->
            Application.put_env(:opal_core, :clock_override, DateTime.truncate(dt, :microsecond))
            json(conn, %{"ok" => true, "clock" => DateTime.to_iso8601(dt)})

          _ ->
            conn |> put_status(422) |> json(%{"error" => "invalid_iso"})
        end

      true ->
        conn |> put_status(422) |> json(%{"error" => "iso_or_clear_required"})
    end
  end

  @doc "Run one real TFT tick (the same run_now/0 the Oban cron performs)."
  def temporal_tick(conn, _params) do
    result = OpalCore.SocialFlow.TemporalFollowThroughTickWorker.run_now()
    json(conn, %{"ok" => true, "tick" => inspect(result)})
  end

  @doc """
  Run the B5 context producers for one user (the same functions the
  hourly worker invokes): pod supply suggestion + solo check-in rhythm.

  The sweep first records the user's Center activity through the
  product's own memory ingest entry (`SocialMemory.ingest/5` — the
  call the intelligence Pipeline makes after a user message), with an
  empty extraction: staging stacks run without the AI pipeline
  service, so a real Center send otherwise never lands in
  ConversationIndex and every activity gate reads a fiction. The
  ingest records activity only; it extracts no facts.
  """
  def context_sweep(conn, %{"user_id" => user_id}) do
    _ = record_center_activity(user_id)
    supply = OpalCore.SocialFlow.Households.maybe_surface_supply(user_id)

    solo =
      case OpalCore.Intelligence.ProactiveConversation.maybe_initiate_solo_check_in(user_id) do
        {:ok, %{status: status}} -> %{"status" => status}
        {:suppressed, reason} -> %{"status" => "suppressed", "reason" => reason_string(reason)}
        {:error, reason} -> %{"status" => "error", "reason" => reason_string(reason)}
      end

    json(conn, %{
      "ok" => true,
      "supply" => inspect(supply),
      "solo" => solo
    })
  end

  def context_sweep(conn, _params) do
    conn |> put_status(422) |> json(%{"error" => "user_id_required"})
  end

  @doc """
  Provision an account's stored intelligence maturity (dev staging
  only). The AttentionBudget maturity gate is product law — fresh
  synthetic accounts are `:new` and are correctly denied proactive
  slots; walk/seed accounts carry stored maturity from real use.
  This writes the same AssistancePreference record real use writes.
  """
  def set_maturity(conn, %{"user_id" => user_id, "maturity" => maturity})
      when maturity in ~w(new learning established) do
    alias OpalCore.Repo
    alias OpalCore.SocialFlow.AssistancePreference

    pref =
      Repo.get_by(AssistancePreference, user_id: user_id) ||
        %AssistancePreference{user_id: user_id}

    case pref
         |> AssistancePreference.changeset(%{intelligence_maturity: maturity})
         |> Repo.insert_or_update() do
      {:ok, _} -> json(conn, %{"ok" => true, "maturity" => maturity})
      {:error, _} -> conn |> put_status(422) |> json(%{"error" => "invalid_maturity_write"})
    end
  end

  def set_maturity(conn, _params) do
    conn |> put_status(422) |> json(%{"error" => "user_id_and_maturity_required"})
  end

  defp reason_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp reason_string(reason), do: inspect(reason)

  defp record_center_activity(user_id) do
    with {:ok, conversation} <- OpalCore.OpalConversations.get_or_create_conversation(user_id) do
      OpalCore.SocialMemory.ingest(
        user_id,
        conversation.id,
        Ecto.UUID.generate(),
        %{},
        %{
          sender_id: user_id,
          timestamp: OpalCore.SocialFlow.Clock.utc_now(),
          body: "",
          participant_ids: [user_id]
        }
      )
    end
  rescue
    _ -> :ok
  end
end
