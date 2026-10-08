defmodule OpalCore.ArtifactsTest do
  @moduledoc "Paste G Phase 9 — invent-nothing artifacts + versioning."
  use OpalCore.DataCase, async: false

  alias OpalCore.Artifacts
  alias OpalCore.Artifacts.Artifact
  alias OpalCore.Bookings.Booking
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Trips

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()

  test "trip itinerary artifact facts match seed; invent-nothing adversarial" do
    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "Big Sur weekend",
               destination_label: "Big Sur",
               starts_on: ~D[2026-11-14],
               ends_on: ~D[2026-11-16]
             })

    assert {:ok, day} =
             Trips.add_day(trip.id, %{
               day_index: 0,
               on_date: ~D[2026-11-14],
               label: "Friday"
             })

    assert {:ok, block} =
             Trips.add_time_block(trip.id, day.id, %{
               slot: "evening",
               time_label: "~7pm",
               block_kind: "meal",
               title: "Dinner"
             })

    assert {:ok, _act} =
             Trips.add_activity(trip.id, block.id, %{
               venue_name: "Nepenthe",
               venue_area: "Big Sur",
               activity_kind: "meal"
             })

    # Confirmed booking fact only — no invented hotel/flight.
    %Booking{}
    |> Booking.changeset(%{
      account_id: alex(),
      booking_type: "restaurant",
      status: "confirmed",
      plan_id: trip.id,
      confirmation_number: "OT-REAL-77",
      amount_cents: 12_000,
      currency: "USD",
      details: %{"venue" => "Nepenthe"}
    })
    |> Repo.insert!()

    assert {:ok, payload} = Artifacts.generate(alex(), "trip_itinerary", trip.id)
    assert payload.kind == "trip_itinerary"
    assert payload.title == "Big Sur weekend"
    assert payload.version == 1
    assert is_binary(payload.share_url)
    assert String.contains?(payload.share_url, "/share/artifacts/")

    art = Repo.get!(Artifact, payload.artifact_id)
    {:ok, html} = Artifacts.render_share_html(art)

    assert html =~ "Big Sur weekend"
    assert html =~ "Big Sur"
    assert html =~ "2026-11-14"
    assert html =~ "Nepenthe"
    assert html =~ "OT-REAL-77"
    assert html =~ "Made with Opal"
    assert html =~ ~s(name="robots" content="noindex,nofollow")

    # Invent-nothing adversarial: never fabricate flights/hotels/costs not in data.
    refute html =~ ~r/flight/i
    refute html =~ ~r/hotel/i
    refute html =~ "UA"
    refute html =~ "Marriott"
    refute html =~ "$999"
    refute html =~ "confirmation_number"
    # Cost that IS in booking may appear; invented ones must not.
    refute html =~ "USD 999"
  end

  test "event_plan missing when/where → TBD labeled, never fabricated" do
    assert {:ok, plan} =
             %SharedPlan{}
             |> SharedPlan.changeset(%{
               conversation_id: Fixtures.conv_alex_jordan_id(),
               title: "Dinner someday",
               status: "tentative",
               timezone: "America/Los_Angeles",
               created_by_user_id: alex()
             })
             |> Repo.insert()

    assert {:ok, payload} = Artifacts.generate(alex(), "event_plan", plan.id)
    art = Repo.get!(Artifact, payload.artifact_id)
    {:ok, html} = Artifacts.render_share_html(art)

    assert html =~ "Dinner someday"
    assert html =~ "TBD"
    refute html =~ "Fort Oak"
    refute html =~ "7:00"
    refute html =~ ~r/\$\d/
  end

  test "regenerate on change marks old outdated; old link still works with banner" do
    assert {:ok, trip} =
             Trips.create_trip(alex(), %{
               title: "Coast run",
               destination_label: "Santa Cruz"
             })

    assert {:ok, v1} = Artifacts.generate(alex(), "trip_itinerary", trip.id)
    art1 = Repo.get!(Artifact, v1.artifact_id)
    token1 = art1.signed_token

    assert {:ok, trip2} =
             Trips.update_trip(Repo.get!(OpalCore.Trips.Trip, trip.id), %{
               destination_label: "Monterey"
             })

    assert trip2.destination_label == "Monterey"

    assert {:ok, v2} = Artifacts.generate(alex(), "trip_itinerary", trip.id)
    assert v2.version == 2
    assert v2.artifact_id != v1.artifact_id

    art1_after = Repo.get!(Artifact, art1.id)
    assert not is_nil(art1_after.outdated_at)

    assert {:ok, old} = Artifacts.get_by_token(token1)
    {:ok, old_html} = Artifacts.render_share_html(old)
    assert old_html =~ "newer version"
    # Old snapshot still renders (policy: old link works; no redirect-to-latest).
    assert old_html =~ "Coast run"
    assert old_html =~ "Santa Cruz"
    refute old_html =~ "Monterey"

    art2 = Repo.get!(Artifact, v2.artifact_id)
    {:ok, new_html} = Artifacts.render_share_html(art2)
    assert new_html =~ "Monterey"
    refute new_html =~ "newer version"
  end

  test "foreign account cannot generate artifact for private trip" do
    assert {:ok, trip} = Trips.create_trip(alex(), %{title: "Private"})
    assert {:error, :not_found} = Artifacts.generate(jordan(), "trip_itinerary", trip.id)
  end
end
