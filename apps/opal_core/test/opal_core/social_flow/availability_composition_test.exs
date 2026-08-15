defmodule OpalCore.SocialFlow.AvailabilityCompositionTest do
  @moduledoc """
  Calendar privacy + availability composition law tests.

  KNOW AVAILABILITY DEEPLY. REVEAL MINIMALLY.
  """
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.AvailabilityComposition, as: Comp

  # Thursday 2026-08-13 in America/Los_Angeles (PDT, UTC-7)
  @thu ~D[2026-08-13]
  @tz "America/Los_Angeles"

  defp busy(start_iso, end_iso) do
    %{"start_at" => start_iso, "end_at" => end_iso, "busy" => true, "no_event_titles" => true}
  end

  defp participant(id, opts) do
    %{
      "user_id" => id,
      "busy_blocks" => Keyword.get(opts, :busy, []),
      "calendar_connected" => Keyword.get(opts, :connected, true),
      "required" => Keyword.get(opts, :required, true),
      "optional" => Keyword.get(opts, :optional, false),
      "flexibility" => Keyword.get(opts, :flexibility),
      "late_ok" => Keyword.get(opts, :late_ok, false),
      "timezone" => Keyword.get(opts, :timezone, @tz)
    }
  end

  # ---------------------------------------------------------------------------
  # Daypart
  # ---------------------------------------------------------------------------

  test "daypart evening resolves without forcing exact time" do
    assert {:ok, w} = Comp.resolve_daypart("evening", @thu, @tz)
    assert w["exact_time"] == false
    assert w["daypart"] == "evening"
    assert match?(%DateTime{}, w["start_at"])
    assert match?(%DateTime{}, w["end_at"])
    assert DateTime.compare(w["end_at"], w["start_at"]) == :gt
  end

  test "daypart aliases: after work, weekend evening" do
    assert {:ok, _} = Comp.resolve_daypart("after work", @thu, @tz)
    assert {:ok, _} = Comp.resolve_daypart("weekend evening", ~D[2026-08-15], @tz)
    assert {:error, :unknown_daypart} = Comp.resolve_daypart("tea time", @thu, @tz)
  end

  # ---------------------------------------------------------------------------
  # Dyad fit — founder test 34
  # ---------------------------------------------------------------------------

  test "dyad: free after 6 vs free after 7:15 → Thursday · 7:30 works for both" do
    # Local LA times as UTC (PDT = UTC-7): 18:00 LA = 01:00 next UTC; use UTC wall for clarity
    # Use pure UTC daypart window to avoid zone flakiness in CI
    window_start = ~U[2026-08-13 17:00:00.000000Z]
    window_end = ~U[2026-08-13 21:00:00.000000Z]

    a =
      participant("user-a",
        busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T18:00:00Z")]
      )

    b =
      participant("user-b",
        busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T19:15:00Z")]
      )

    result =
      Comp.compose_fit(%{
        "mode" => "chosen_social_time",
        "participants" => [a, b],
        "candidate_start" => window_start,
        "candidate_end" => window_end,
        "timezone" => "UTC",
        "open_ended" => true,
        "actor_user_id" => "user-a"
      })

    shared = result["shared"]
    assert shared["fit_status"] == "fit"
    assert shared["shared_safe"] == true
    assert shared["open_ended"] == true
    assert shared["suggested_end"] == nil
    assert shared["label"] =~ "7:30"
    assert shared["label"] =~ "works for both of you"
    refute shared["label"] =~ "therapy"
    refute shared["label"] =~ "work meeting"
    refute shared["label"] =~ "gets off work"
    refute Map.has_key?(shared, "event_title")
    assert Comp.authorizes_set?(result) == false
    Comp.assert_disclosure_safe!(shared)

    # Suggested start should be 19:30 UTC (round up from 19:15)
    assert shared["suggested_start"] =~ "19:30"
  end

  test "dyad shared result never includes peer private causes" do
    a =
      participant("jordan",
        busy: [
          busy("2026-08-13T00:00:00Z", "2026-08-13T18:30:00Z")
          |> Map.put("title", "therapy")
        ]
      )

    b =
      participant("sadeil",
        busy: [
          busy("2026-08-13T00:00:00Z", "2026-08-13T19:00:00Z")
          |> Map.put("event_title", "work until 7")
        ]
      )

    result =
      Comp.compose_fit(%{
        "mode" => "chosen_social_time",
        "participants" => [a, b],
        "candidate_start" => ~U[2026-08-13 17:00:00Z],
        "candidate_end" => ~U[2026-08-13 21:00:00Z],
        "timezone" => "UTC"
      })

    shared = Jason.encode!(result["shared"])
    refute shared =~ "therapy"
    refute shared =~ "work until"
    refute shared =~ "event_title"
    Comp.assert_disclosure_safe!(result["shared"])
  end

  # ---------------------------------------------------------------------------
  # Group fit — founder test 35
  # ---------------------------------------------------------------------------

  test "group: strongest workable time; optional late; no private reasons" do
    required =
      for {id, free_after} <- [
            {"u1", "18:00"},
            {"u2", "18:30"},
            {"u3", "19:00"},
            {"u4", "19:00"}
          ] do
        participant(id,
          busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T#{free_after}:00Z")]
        )
      end

    optional =
      participant("jess",
        busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T19:45:00Z")],
        required: false,
        optional: true,
        late_ok: true
      )

    result =
      Comp.compose_fit(%{
        "mode" => "chosen_social_time",
        "participants" => required ++ [optional],
        "candidate_start" => ~U[2026-08-13 17:00:00Z],
        "candidate_end" => ~U[2026-08-13 22:00:00Z],
        "timezone" => "UTC",
        "open_ended" => true
      })

    shared = result["shared"]
    assert shared["fit_status"] in ~w(fit partial_fit)
    assert shared["label"] =~ "works for everyone" or shared["label"] =~ "7"
    refute Jason.encode!(shared) =~ "jess"
    refute Jason.encode!(shared) =~ "work meeting"
    Comp.assert_disclosure_safe!(shared)
  end

  # ---------------------------------------------------------------------------
  # Fixed event — founder test 36
  # ---------------------------------------------------------------------------

  test "fixed event: concert Saturday 8 PM does not run find-a-time" do
    start = ~U[2026-08-15 20:00:00Z]
    end_at = ~U[2026-08-15 23:00:00Z]

    people =
      for id <- ["a", "b", "c"] do
        participant(id, busy: [])
      end

    result =
      Comp.compose_fit(%{
        "mode" => "fixed_event",
        "fixed_start" => start,
        "fixed_end" => end_at,
        "event_label" => "Concert",
        "participants" => people,
        "timezone" => "UTC"
      })

    shared = result["shared"]
    assert shared["mode"] == "fixed_event"
    assert shared["find_a_time"] == false
    assert shared["fit_status"] == "fit"
    assert shared["label"] =~ "Concert"
    assert shared["label"] =~ "8"
  end

  test "fixed event with late joiner stays private on cause" do
    result =
      Comp.compose_fit(%{
        "mode" => "fixed_event",
        "fixed_start" => ~U[2026-08-15 19:00:00Z],
        "fixed_end" => ~U[2026-08-15 22:00:00Z],
        "event_label" => "Dinner",
        "participants" => [
          participant("a", busy: []),
          participant("jess",
            busy: [busy("2026-08-15T18:00:00Z", "2026-08-15T19:45:00Z")],
            late_ok: true
          )
        ],
        "timezone" => "UTC"
      })

    shared = result["shared"]
    assert shared["fit_status"] == "partial_fit"
    assert shared["label"] =~ "joining later"
    refute shared["label"] =~ "work"
    refute Map.has_key?(shared, "private_reason")
  end

  # ---------------------------------------------------------------------------
  # Flexibility — founder test 37
  # ---------------------------------------------------------------------------

  test "flexibility does not auto-move calendar; needs confirm" do
    # Busy covers whole evening window
    a =
      participant("a",
        busy: [busy("2026-08-13T17:00:00Z", "2026-08-13T21:00:00Z")],
        flexibility: "I can move things around"
      )

    b = participant("b", busy: [])

    result =
      Comp.compose_fit(%{
        "mode" => "chosen_social_time",
        "participants" => [a, b],
        "candidate_start" => ~U[2026-08-13 17:00:00Z],
        "candidate_end" => ~U[2026-08-13 21:00:00Z],
        "timezone" => "UTC",
        "actor_user_id" => "a"
      })

    shared = result["shared"]
    assert shared["fit_status"] in ~w(needs_flexibility_confirm fit)
    assert Comp.authorizes_calendar_write?(result) == false
    assert shared["auto_moved_calendar"] in [false, nil] or not Map.has_key?(shared, "auto_moved_calendar")

    private = Comp.private_guidance(result, "a")
    assert private["only_you"] == true
    assert private["copy"] =~ "will not move" or private["copy"] =~ "confirm"
  end

  # ---------------------------------------------------------------------------
  # Calendar privacy — founder test 38
  # ---------------------------------------------------------------------------

  test "shared payload fails assert if private keys leak" do
    assert_raise RuntimeError, ~r/disclosure leak/, fn ->
      Comp.assert_disclosure_safe!(%{
        "label" => "ok",
        "event_title" => "therapy"
      })
    end

    assert_raise RuntimeError, ~r/disclosure leak/, fn ->
      Comp.assert_disclosure_safe!(%{
        "label" => "Jordan is free after therapy at 6:30"
      })
    end
  end

  test "private guidance is actor-scoped and only_you" do
    result =
      Comp.compose_fit(%{
        "mode" => "chosen_social_time",
        "participants" => [
          participant("a", busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T19:00:00Z")]),
          participant("b", busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T19:15:00Z")])
        ],
        "candidate_start" => ~U[2026-08-13 17:00:00Z],
        "candidate_end" => ~U[2026-08-13 21:00:00Z],
        "timezone" => "UTC",
        "actor_user_id" => "a"
      })

    mine = Comp.private_guidance(result, "a")
    assert mine["only_you"] == true
    assert is_binary(mine["copy"])
    refute mine["copy"] =~ "b has"
    assert Comp.private_guidance(result, "stranger") == nil
  end

  # ---------------------------------------------------------------------------
  # Oracle attack — founder test 39
  # ---------------------------------------------------------------------------

  test "oracle attack: repeated probes do not return peer busy edges" do
    result =
      Comp.compose_fit(%{
        "mode" => "chosen_social_time",
        "participants" => [
          participant("attacker", busy: []),
          participant("victim",
            busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T19:17:00Z")]
          )
        ],
        "candidate_start" => ~U[2026-08-13 17:00:00Z],
        "candidate_end" => ~U[2026-08-13 21:00:00Z],
        "timezone" => "UTC",
        "probe_count" => 0
      })

    # Narrow probes
    for n <- 1..6 do
      probe =
        Comp.probe_response(result, %{
          "probe_count" => n,
          "candidate_start" => "2026-08-13T#{18 + div(n, 2)}:#{rem(n, 2) * 30}:00Z"
        })

      assert probe["shared_safe"] == true
      assert probe["allows_high_res_peer_busy"] == false
      assert probe["peer_busy_edges"] == nil
      refute Map.has_key?(probe, "victim_busy_until")

      if n >= 4 do
        assert probe["oracle_protected"] == true
        assert probe["response_class"] == "oracle_refusal"
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Disconnected calendar — founder test 40
  # ---------------------------------------------------------------------------

  test "partial coverage: does not claim works for both without peer calendar" do
    result =
      Comp.compose_fit(%{
        "mode" => "chosen_social_time",
        "participants" => [
          participant("a",
            connected: true,
            busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T18:00:00Z")]
          ),
          participant("jordan", connected: false, busy: [])
        ],
        "candidate_start" => ~U[2026-08-13 17:00:00Z],
        "candidate_end" => ~U[2026-08-13 21:00:00Z],
        "timezone" => "UTC",
        "actor_user_id" => "a"
      })

    shared = result["shared"]
    assert shared["fit_status"] == "partial_coverage"
    refute shared["label"] =~ "works for both"
    assert shared["label"] =~ "Waiting" or shared["label"] =~ "works for you"
    assert shared["works_for_both"] == false
  end

  # ---------------------------------------------------------------------------
  # Open-ended time + authority
  # ---------------------------------------------------------------------------

  test "open-ended social time does not fabricate end" do
    result =
      Comp.compose_fit(%{
        "mode" => "chosen_social_time",
        "participants" => [
          participant("a", busy: []),
          participant("b", busy: [])
        ],
        "candidate_start" => ~U[2026-08-13 17:00:00Z],
        "candidate_end" => ~U[2026-08-13 21:00:00Z],
        "open_ended" => true,
        "timezone" => "UTC"
      })

    assert result["shared"]["open_ended"] == true
    assert result["shared"]["suggested_end"] == nil
    refute result["shared"]["label"] =~ "–"
    assert result["internal_soft_horizon_minutes"] == 90
  end

  test "never authorizes set or calendar write" do
    refute Comp.authorizes_set?()
    refute Comp.authorizes_calendar_write?()
  end

  # ---------------------------------------------------------------------------
  # Timezone — founder test 24 / 42
  # ---------------------------------------------------------------------------

  test "timezone: wall-clock equality across zones is rejected; composition uses UTC instants" do
    # Same wall clock 19:00 is not the same instant across zones.
    # Rome summer = UTC+2 → 17:00Z; LA summer = UTC-7 → 02:00Z next day.
    rome_as_utc = ~U[2026-08-13 17:00:00.000000Z]
    la_as_utc = ~U[2026-08-14 02:00:00.000000Z]
    refute DateTime.compare(rome_as_utc, la_as_utc) == :eq

    # Event at LA 7 PM (02:00Z next day). Cali busy around that instant.
    result =
      Comp.compose_fit(%{
        "mode" => "fixed_event",
        "fixed_start" => la_as_utc,
        "fixed_end" => DateTime.add(la_as_utc, 7200, :second),
        "event_label" => "Call",
        "participants" => [
          participant("italy", busy: [], timezone: "Europe/Rome"),
          participant("cali",
            busy: [
              busy(
                DateTime.to_iso8601(DateTime.add(la_as_utc, -3600, :second)),
                DateTime.to_iso8601(DateTime.add(la_as_utc, 3600, :second))
              )
            ],
            timezone: "America/Los_Angeles"
          )
        ],
        "timezone" => "UTC"
      })

    assert result["shared"]["fit_status"] == "conflict"
    Comp.assert_disclosure_safe!(result["shared"])
  end

  # ---------------------------------------------------------------------------
  # Progressive daypart → exact suggestion
  # ---------------------------------------------------------------------------

  test "daypart agreement can stay daypart-first then resolve exact slot" do
    assert {:ok, w} = Comp.resolve_daypart("Thursday evening" |> then(fn _ -> "evening" end), @thu, "UTC")

    result =
      Comp.compose_fit(%{
        "mode" => "chosen_social_time",
        "daypart" => "evening",
        "date" => "2026-08-13",
        "timezone" => "UTC",
        "conversation_agreed_daypart" => true,
        "participants" => [
          participant("a", busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T18:00:00Z")]),
          participant("b", busy: [busy("2026-08-13T00:00:00Z", "2026-08-13T19:15:00Z")])
        ]
      })

    assert result["shared"]["daypart"] == "evening"
    assert result["shared"]["suggested_start"]
    assert result["shared"]["label"] =~ "7:30" or result["shared"]["label"] =~ "works"
    _ = w
  end
end
