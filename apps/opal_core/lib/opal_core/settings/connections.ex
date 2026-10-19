defmodule OpalCore.Settings.Connections do
  @moduledoc """
  Repair #18 DIR-2 — Settings > Connections status projection
  (connections-verification-report.md Part 4).

  SP-3 law: this module is the ONE explicit projection for the
  Connections surface. The server computes every status; the web
  client renders the payload verbatim and contains no status logic
  of its own.

  Derivation (Part 4.3, first match wins):
    1. provenance simulated/synthetic -> `simulated`
    2. a named founder gate applies -> `gated` (or `not_connected`
       for user-grant rows, where the gate IS the user's own tap)
    3. credential absent -> the row is OMITTED (absent integrations
       are never listed), except a connection with recorded
       verification history whose credential vanished, which renders
       `gated` with gate code `credential_removed`
    4. no fresh verification record -> `unverified`
    5. verification fresh AND function evidence on record ->
       `working` (`working_test` when mode is test)

  Config presence is read at request time from the SAME sources the
  adapters read. Config presence alone caps at `unverified`: a
  provider probe alone can never produce `working` either — function
  evidence is a row-level requirement (the Deepgram-live lesson).

  No credential value, fragment, or length is ever a field.
  """

  alias OpalCore.Intelligence.{DeepgramClient, LlmAdapter}
  alias OpalCore.Places.Gateway
  alias OpalCore.Places.Providers.Geoapify
  alias OpalCore.Settings.VerificationLedger
  alias OpalCore.SocialFlow.PhoneVerification.Provider, as: PhoneProvider
  alias OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections
  alias OpalCore.SocialFlow.Sms.TwilioSmsAdapter
  alias OpalCore.Voice.ElevenLabs
  alias OpalCore.Wallets.StripeCheckout

  @category_order %{
    "intelligence" => 0,
    "voice" => 1,
    "phone_and_messaging" => 2,
    "places_and_search" => 3,
    "travel" => 4,
    "your_accounts" => 5,
    "payments" => 6
  }

  @labels %{
    "working" => "Working",
    "working_test" => "Working - test mode",
    "gated" => "Waiting on you",
    "not_connected" => "Not connected",
    "unverified" => "Not verified yet",
    "simulated" => "Simulated - not a real connection",
    "unknown" => "Could not check"
  }

  def status_labels, do: @labels

  @doc """
  Build the full Connections payload for one user.

  Options: `:now` (DateTime, test clock), `:build_ref`, `:environment`.
  """
  def build(user_id, opts \\ []) do
    now = Keyword.get(opts, :now, DateTime.utc_now())
    ctx = %{user_id: user_id, now: now}

    rows =
      candidate_ids()
      |> Enum.map(&build_row(&1, ctx))
      |> Enum.reject(&is_nil/1)
      |> Enum.sort_by(fn r ->
        {Map.get(@category_order, r["category"], 99), r["display_name"]}
      end)

    %{
      "connections" => rows,
      "generated_at" => DateTime.to_iso8601(now),
      "build_ref" => Keyword.get(opts, :build_ref) || System.get_env("OPAL_BUILD_REF") || "dev",
      "environment" =>
        Keyword.get(opts, :environment) ||
          to_string(Application.get_env(:opal_core, :env, Mix.env()))
    }
  end

  # The report Part 4.2 row inventory. Deepgram live transcription and
  # Twilio Voice get NO row (absent as user-facing connections).
  defp candidate_ids do
    known =
      VerificationLedger.known_connection_ids()
      |> Enum.filter(&(&1 in known_ids()))

    Enum.uniq(known_ids() ++ known)
  end

  defp known_ids do
    ~w(deepseek deepgram_batch elevenlabs twilio_verify twilio_messaging
       geoapify google_places brave duffel google_calendar gmail
       stripe_wallet_loads)
  end

  # ------------------------------------------------------------------
  # Row construction. Each clause returns a "pre-status" map or nil
  # (absent). `derive_status/2` then applies Part 4.3 in order.
  # ------------------------------------------------------------------

  defp build_row(id, ctx) do
    case pre_status(id, ctx) do
      nil -> credential_removed_row(id, ctx)
      pre -> derive_status(pre, ctx)
    end
  end

  # Part 4.3 rule 3 exception: a connection with recorded verification
  # history whose credential has since vanished is NEWS, not silence —
  # it renders gated with gate code credential_removed. A connection
  # that never had a credential or a record stays absent (omitted).
  defp credential_removed_row(id, _ctx) do
    case VerificationLedger.events_for(id) do
      [] ->
        nil

      _events ->
        case row_meta(id) do
          nil ->
            nil

          {display_name, category, powers} ->
            base(id, display_name, category, powers)
            |> Map.put("credential_status", "absent")
            |> Map.put("function_status", "gated")
            |> Map.put("gate", %{
              "code" => "credential_removed",
              "reason_plain" =>
                "This was set up before, but its sign-in details are gone now, so it cannot work.",
              "founder_step" =>
                "Put the sign-in details back in ~/.opal/r1a1.env, then restart Opal once."
            })
            |> finish("gated", nil, VerificationLedger.summary(id))
            |> Map.drop(["google_not_connected", "google_last_synced_at"])
        end
    end
  end

  defp row_meta(id) do
    %{
      "deepseek" =>
        {"Opal's thinking (DeepSeek)", "intelligence",
         "Reads your messages and helps Opal reply, plan, and remember decisions."},
      "deepgram_batch" =>
        {"Listening to voice notes (Deepgram)", "voice",
         "Turns voice notes and recordings into words Opal can read."},
      "elevenlabs" =>
        {"Opal's voice (ElevenLabs)", "voice",
         "Speaks Opal's approved words out loud in a thread."},
      "twilio_verify" =>
        {"Phone number checks (Twilio)", "phone_and_messaging",
         "Texts the one-time code that proves a phone number at sign-up."},
      "twilio_messaging" =>
        {"Invite texts (Twilio)", "phone_and_messaging",
         "Texts invitations to people who are not on Opal yet."},
      "geoapify" =>
        {"Places search (Geoapify)", "places_and_search",
         "Finds places and addresses when a plan needs somewhere to go."},
      "google_places" =>
        {"Place details (Google Places)", "places_and_search",
         "Adds details like phone numbers and websites for places."},
      "brave" =>
        {"Web search (Brave)", "places_and_search",
         "Looks up real web results when Opal needs facts about a place or event."},
      "duffel" =>
        {"Flights (Duffel)", "travel", "Searches flights and, when you say so, books them."},
      "stripe_wallet_loads" =>
        {"Adding money (Stripe)", "payments", "Would let you add money to your Opal wallet."}
    }
    |> Map.get(id)
  end

  defp base(id, display_name, category, powers) do
    %{
      "id" => id,
      "display_name" => display_name,
      "category" => category,
      "powers" => powers,
      "credential_status" => "present",
      "provider_status" => "unverified",
      "function_status" => "unproven",
      "provenance" => "real",
      "mode" => "live",
      "verification_basis" => "probe_and_function",
      "gate" => nil,
      "actions" => [],
      "risk_note" => nil
    }
  end

  defp pre_status("deepseek", _ctx) do
    if LlmAdapter.configured?() do
      base(
        "deepseek",
        "Opal's thinking (DeepSeek)",
        "intelligence",
        "Reads your messages and helps Opal reply, plan, and remember decisions."
      )
    end
  end

  defp pre_status("deepgram_batch", _ctx) do
    if DeepgramClient.configured?() do
      base(
        "deepgram_batch",
        "Listening to voice notes (Deepgram)",
        "voice",
        "Turns voice notes and recordings into words Opal can read."
      )
      |> Map.put("verification_basis", "function_evidence")
    end
  end

  defp pre_status("elevenlabs", _ctx) do
    if ElevenLabs.configured?() do
      base(
        "elevenlabs",
        "Opal's voice (ElevenLabs)",
        "voice",
        "Speaks Opal's approved words out loud in a thread."
      )
      |> Map.put("verification_basis", "function_evidence")
      |> Map.put(
        "risk_note",
        "The voice Opal uses today is retired by ElevenLabs on Dec 31, 2026. A new voice needs picking before then."
      )
    end
  end

  defp pre_status("twilio_verify", _ctx) do
    row =
      base(
        "twilio_verify",
        "Phone number checks (Twilio)",
        "phone_and_messaging",
        "Texts the one-time code that proves a phone number at sign-up."
      )

    case PhoneProvider.mode() do
      :synthetic_development ->
        row
        |> Map.put("provenance", "synthetic_provider")
        |> Map.put("mode", "synthetic")

      :production_sms ->
        if twilio_account_present?() and present_env("OPAL_TWILIO_VERIFY_SERVICE_SID") do
          row
        end

      _ ->
        nil
    end
  end

  defp pre_status("twilio_messaging", _ctx) do
    if twilio_account_present?() do
      row =
        base(
          "twilio_messaging",
          "Invite texts (Twilio)",
          "phone_and_messaging",
          "Texts invitations to people who are not on Opal yet."
        )

      case TwilioSmsAdapter.readiness() do
        :ready ->
          row

        {:disabled, :from_or_messaging_service_missing} ->
          row
          |> Map.put("function_status", "gated")
          |> Map.put("gate", %{
            "code" => "twilio_sender_missing",
            "reason_plain" => "Opal has no sender to text invites from yet.",
            "founder_step" =>
              "In Twilio Console, create a Messaging Service (or confirm a Twilio number), add OPAL_TWILIO_MESSAGING_SERVICE_SID to ~/.opal/r1a1.env, then restart Opal once."
          })

        _ ->
          row
      end
    end
  end

  defp pre_status("geoapify", _ctx) do
    if Geoapify.health()["configured"] do
      base(
        "geoapify",
        "Places search (Geoapify)",
        "places_and_search",
        "Finds places and addresses when a plan needs somewhere to go."
      )
    end
  end

  defp pre_status("google_places", _ctx) do
    registry = Gateway.registry()["providers"]["google_places"]

    if registry["configured"] do
      row =
        base(
          "google_places",
          "Place details (Google Places)",
          "places_and_search",
          "Adds details like phone numbers and websites for places."
        )
        |> Map.put("provider_status", "refused")

      if registry["billing_ready"] do
        row
      else
        row
        |> Map.put("function_status", "gated")
        |> Map.put("gate", %{
          "code" => "places_api_not_enabled",
          "reason_plain" =>
            "Google has not switched on place details for Opal yet, so details like phone numbers cannot load.",
          "founder_step" =>
            "In Google Cloud Console for project 449126891803, enable Places API (New) and confirm a billing account is linked to that project, then restart Opal once. No new key is needed."
        })
      end
    end
  end

  defp pre_status("brave", _ctx) do
    if present_env("BRAVE_API_KEY") do
      base(
        "brave",
        "Web search (Brave)",
        "places_and_search",
        "Looks up real web results when Opal needs facts about a place or event."
      )
    end
  end

  defp pre_status("duffel", _ctx) do
    case System.get_env("DUFFEL_API_KEY") do
      key when is_binary(key) and key != "" ->
        row =
          base(
            "duffel",
            "Flights (Duffel)",
            "travel",
            "Searches flights and, when you say so, books them."
          )

        if OpalCore.Bookings.Duffel.test_mode?(key) do
          row
          |> Map.put("provenance", "test_provider")
          |> Map.put("mode", "test")
        else
          row
        end

      _ ->
        nil
    end
  end

  defp pre_status("google_calendar", ctx), do: google_row("google_calendar", ctx)
  defp pre_status("gmail", ctx), do: google_row("gmail", ctx)

  defp pre_status("stripe_wallet_loads", _ctx) do
    if StripeCheckout.key_present?() do
      row =
        base(
          "stripe_wallet_loads",
          "Adding money (Stripe)",
          "payments",
          "Would let you add money to your Opal wallet."
        )
        |> Map.put("verification_basis", "probe")

      cond do
        not StripeCheckout.configured?() ->
          row
          |> Map.put("function_status", "gated")
          |> Map.put("gate", %{
            "code" => "wallet_loads_gated",
            "reason_plain" => "Adding money is off while it is reviewed. Nothing can be charged.",
            "founder_step" =>
              "Only after the legal review: set OPAL_WALLET_LOADS_ENABLED to true in ~/.opal/r1a1.env, add STRIPE_WEBHOOK_SECRET from the Stripe dashboard, then restart Opal once."
          })

        not present_env("STRIPE_WEBHOOK_SECRET") ->
          row
          |> Map.put("function_status", "gated")
          |> Map.put("gate", %{
            "code" => "stripe_webhook_secret_missing",
            "reason_plain" => "Adding money cannot be confirmed safely yet.",
            "founder_step" =>
              "Add STRIPE_WEBHOOK_SECRET from the Stripe dashboard webhook endpoint to ~/.opal/r1a1.env, then restart Opal once."
          })

        true ->
          row
      end
    end
  end

  defp pre_status(_id, _ctx), do: nil

  # Google rows share one per-user grant. The stored connection row IS
  # the recorded state for account rows: a real connected grant counts
  # as function evidence stamped at its last sync (30-day TTL applies,
  # like every function-evidence basis).
  defp google_row(id, ctx) do
    {display_name, powers} =
      if id == "google_calendar" do
        {"Your Google Calendar",
         "Lets Opal check busy times when a plan needs a time. Read only."}
      else
        {"Your Gmail", "Lets Opal watch for booking confirmations in your email. Read only."}
      end

    row =
      base(id, display_name, "your_accounts", powers)
      |> Map.put("credential_status", "user_grant")
      |> Map.put("verification_basis", "function_evidence")

    status = ProviderConnections.public_status(ctx.user_id, "google_calendar")
    oauth_ready = GoogleAdapter.oauth_configured?()

    cond do
      status["simulated"] == true ->
        row
        |> Map.put("provenance", "simulated")
        |> Map.put("mode", "simulated")
        |> Map.put("actions", [disconnect_action(id)])

      status["connected"] == true and id == "gmail" and
          not gmail_scope?(status["scopes"] || []) ->
        row
        |> Map.put("function_status", "gated")
        |> Map.put("gate", %{
          "code" => "gmail_scope_missing",
          "reason_plain" =>
            "Your Google sign-in did not include email, so Opal cannot watch for confirmations.",
          "founder_step" =>
            "Disconnect Google in Connected sources, then connect again and allow email access."
        })
        |> Map.put("actions", [disconnect_action(id)])

      status["connected"] == true ->
        row
        |> Map.put("provider_status", "verified")
        |> Map.put("function_status", "working")
        |> Map.put("google_last_synced_at", status["last_synced_at"])
        |> Map.put("actions", [disconnect_action(id)])

      true ->
        row
        |> Map.put("function_status", "gated")
        |> Map.put("google_not_connected", true)
        |> Map.put(
          "actions",
          if(oauth_ready, do: [connect_action(id)], else: [])
        )
        |> then(fn r ->
          if oauth_ready do
            r
          else
            Map.put(r, "gate", %{
              "code" => "google_signin_not_set_up",
              "reason_plain" =>
                "Google sign-in is not set up on this server yet. You can still share your availability by hand.",
              "founder_step" =>
                "Add the Google sign-in details (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI) to ~/.opal/r1a1.env, then restart Opal once."
            })
          end
        end)
    end
  end

  defp gmail_scope?(scopes) do
    Enum.any?(scopes, &String.contains?(&1, "gmail"))
  end

  defp connect_action(_id) do
    %{
      "kind" => "connect",
      "label" => "Connect",
      "route" => "POST /api/v1/product/connectors/google_calendar/start",
      "enabled" => true,
      "disabled_reason" => nil
    }
  end

  defp disconnect_action(_id) do
    %{
      "kind" => "disconnect",
      "label" => "Disconnect",
      "route" => "POST /api/v1/product/connectors/google_calendar/revoke",
      "enabled" => true,
      "disabled_reason" => nil
    }
  end

  # ------------------------------------------------------------------
  # Part 4.3 derivation — first match wins.
  # ------------------------------------------------------------------

  defp derive_status(pre, ctx) do
    summary = VerificationLedger.summary(pre["id"])

    {verified?, last_verified_at, stale_pass_at} =
      VerificationLedger.basis_state(summary, pre["verification_basis"], ctx.now)

    {verified?, last_verified_at} =
      google_grant_evidence(pre, verified?, last_verified_at, ctx)

    cond do
      # Rule 1 — simulated/synthetic provenance forces simulated,
      # before every other rule. It can never render as connected.
      pre["provenance"] in ["simulated", "synthetic_provider"] ->
        finish(pre, "simulated", nil, summary)

      # Rule 2a — user-grant rows: the missing tap is an action.
      pre["google_not_connected"] == true and is_nil(pre["gate"]) ->
        finish(pre, "not_connected", nil, summary)

      # Rule 2 — a named founder gate.
      not is_nil(pre["gate"]) ->
        finish(pre, "gated", nil, summary)

      pre["google_not_connected"] == true ->
        finish(pre, "gated", nil, summary)

      # Rule 5 — fresh verification + function evidence.
      verified? ->
        status = if pre["mode"] == "test", do: "working_test", else: "working"

        pre
        |> Map.put("function_status", "working")
        |> Map.put("provider_status", verified_provider_status(pre, summary))
        |> finish(status, last_verified_at, summary)

      # Rule 4 — present but never/stale/failed verification.
      true ->
        pre
        |> Map.put("provider_status", refused_or_unverified(summary))
        |> finish("unverified", nil, summary, stale_pass_at)
    end
    |> Map.drop(["google_not_connected", "google_last_synced_at"])
  end

  # A real Google grant is function evidence recorded on the
  # connection row itself (see google_row/2).
  defp google_grant_evidence(pre, verified?, last_verified_at, ctx) do
    synced = pre["google_last_synced_at"]

    cond do
      verified? ->
        {true, last_verified_at}

      is_binary(synced) and pre["function_status"] == "working" ->
        case DateTime.from_iso8601(synced) do
          {:ok, at, _} ->
            if VerificationLedger.fresh?(at, ctx.now, VerificationLedger.function_ttl_days()) do
              {true, at}
            else
              {false, nil}
            end

          _ ->
            {false, nil}
        end

      true ->
        {verified?, last_verified_at}
    end
  end

  defp verified_provider_status(pre, summary) do
    if pre["verification_basis"] in ["probe", "probe_and_function"] and
         not is_nil(summary.last_probe_pass_at) do
      "verified"
    else
      pre["provider_status"]
    end
  end

  defp refused_or_unverified(summary) do
    if summary.last_event_outcome == "refused", do: "refused", else: "unverified"
  end

  defp finish(pre, status, last_verified_at, summary, stale_pass_at \\ nil) do
    detail =
      status_detail(pre, status, last_verified_at, stale_pass_at, summary)

    pre
    |> Map.put("status", status)
    |> Map.put("status_label", Map.fetch!(@labels, status))
    |> Map.put("status_detail", detail)
    |> Map.put(
      "last_verified_at",
      last_verified_at && DateTime.to_iso8601(last_verified_at)
    )
    |> Map.put_new("actions", [])
    |> ensure_actions(status)
  end

  # Platform rows expose no in-app connect/disconnect (there is no
  # honest in-app operation for them). Gated rows carry their gate;
  # a recheck action is NOT advertised until a real probe-runner
  # endpoint exists behind it (no fake controls law).
  defp ensure_actions(pre, _status), do: pre

  defp status_detail(pre, status, last_verified_at, stale_pass_at, summary) do
    case status do
      "simulated" ->
        "This is a test stand-in, not a real connection."

      "gated" ->
        pre["gate"]["reason_plain"]

      "not_connected" ->
        "Connect your Google account so Opal can use this. You can disconnect anytime."

      "working" ->
        "Checked #{short_date(last_verified_at)} - this is working." <>
          risk_suffix(pre)

      "working_test" ->
        "Checked #{short_date(last_verified_at)} - working in test mode. Nothing real is booked or charged." <>
          risk_suffix(pre)

      "unverified" ->
        cond do
          summary.last_event_outcome in ["fail", "refused"] ->
            "The last check did not pass. Opal will not call this working until a check passes."

          not is_nil(stale_pass_at) ->
            "Last checked #{short_date(stale_pass_at)} - that check is too old to trust, so this is not shown as working."

          true ->
            "Opal has what it needs for this, but it has not been checked yet, so it is not shown as working."
        end

      _ ->
        "Opal could not check this connection."
    end
  end

  defp risk_suffix(pre) do
    if pre["risk_note"], do: " " <> pre["risk_note"], else: ""
  end

  defp short_date(nil), do: "recently"

  defp short_date(at) do
    Calendar.strftime(at, "%b %-d, %Y")
  end

  defp twilio_account_present? do
    present_env("OPAL_TWILIO_ACCOUNT_SID") and present_env("OPAL_TWILIO_AUTH_TOKEN")
  end

  defp present_env(name) do
    case System.get_env(name) do
      v when is_binary(v) and v != "" -> true
      _ -> false
    end
  end
end
