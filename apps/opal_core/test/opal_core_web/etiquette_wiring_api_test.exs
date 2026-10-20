defmodule OpalCoreWeb.EtiquetteWiringApiTest do
  @moduledoc """
  I2 etiquette wiring - the full chain over HTTP, link by link:

  graph-create over HTTP (the production caller opens the lifecycle)
  -> POST response-window (the real endpoint, relationship gate live)
  -> GET /opal/plans carries window + limbo facts for BOTH viewers
  -> the pinned clock advances through advance/2, the exact entry
     the Oban stage job calls (test env enqueues no real jobs - the
     repo's Reminders pattern, declared in the machinery)
  -> past expiry the fork fires EXACTLY ONCE
  -> both parties' notices read back through the real needs-you path
  -> the requester's hold is released (plan cancelled through the gate)

  Plus the refusal pins: a gate refusal is a plain line over HTTP,
  never a silent drop, and the recipient's own decline answers
  through the real respond endpoint.
  """
  use OpalCoreWeb.ConnCase, async: false

  import Ecto.Query

  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AttentionSignal,
    FollowThrough,
    NonResponseEtiquette,
    PlanParticipant,
    TemporalFollowThroughLoop
  }

  @hour 3600

  setup do
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  defp activate(conn, name, handle) do
    uniq = rem(System.unique_integer([:positive]), 9000) + 1000
    phone = "+1202555#{uniq}"

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "i2-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => "#{handle}#{uniq}",
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp set_mode(user_id, level) do
    {:ok, _} =
      FollowThrough.update_preferences(user_id, %{
        assistance_level: level,
        timezone: "UTC",
        quiet_hours_start: "12:00",
        quiet_hours_end: "12:00"
      })

    :ok
  end

  defp make_circle(creator_id, recipient_id) do
    %RelationshipType{}
    |> RelationshipType.changeset(%{
      user_id: creator_id,
      contact_user_id: recipient_id,
      type: "friend"
    })
    |> Repo.insert!()
  end

  defp graph_create(token, attrs) do
    build_conn()
    |> auth(token)
    |> post("/api/v1/product/opal/plans/graph-create", attrs)
    |> json_response(201)
  end

  defp list_plan(token, plan_id, query \\ "") do
    build_conn()
    |> auth(token)
    |> get("/api/v1/product/opal/plans" <> query)
    |> json_response(200)
    |> Map.get("plans")
    |> Enum.find(&(&1["id"] == plan_id))
  end

  defp loop_for(plan_id, recipient_id) do
    from(l in TemporalFollowThroughLoop,
      where: l.plan_id == ^plan_id and l.kind == "invitation_response",
      where: fragment("? ->> 'recipient_user_id' = ?", l.metadata, ^recipient_id)
    )
    |> Repo.one!()
  end

  test "the full chain: create -> window -> limbo for both viewers -> fork once -> closures -> hold released",
       %{conn: conn} do
    {tok_creator, creator_id} = activate(conn, "I2 Cara", "i2_cara")
    {tok_recipient, recipient_id} = activate(build_conn(), "I2 Sam", "i2_sam")
    set_mode(recipient_id, "proactive")
    make_circle(creator_id, recipient_id)

    created =
      graph_create(tok_creator, %{
        "title" => "I2 chain dinner #{System.unique_integer([:positive])}",
        "participant_user_ids" => [recipient_id]
      })

    plan = created["plan"]
    plan_id = plan["id"]
    title = plan["title"]

    # Link 1 - the production caller: creating the plan over HTTP
    # opened the lifecycle for the pending invitee.
    loop = loop_for(plan_id, recipient_id)
    assert loop.status == "open"
    assert loop.metadata["stage"] == "awaiting"
    {:ok, t0, _} = DateTime.from_iso8601(loop.metadata["requested_at"])

    # Link 2 - the window, set through the real endpoint.
    conn =
      build_conn()
      |> auth(tok_creator)
      |> post("/api/v1/product/opal/plans/#{plan_id}/response-window", %{
        "recipient_id" => recipient_id,
        "window_seconds" => 48 * @hour
      })

    windowed = json_response(conn, 200)
    assert windowed["ok"] == true
    assert windowed["plan"]["etiquette"]["window"]["set"] == true
    assert windowed["plan"]["etiquette"]["window"]["seconds"] == 48 * @hour
    assert windowed["plan"]["etiquette"]["recipient_user_id"] == recipient_id

    # Link 3 - the contract carries the facts for BOTH viewers.
    creator_view = list_plan(tok_creator, plan_id)
    recipient_view = list_plan(tok_recipient, plan_id)
    assert creator_view["etiquette"]["viewer_role"] == "requester"
    assert creator_view["etiquette"]["window"]["set"] == true
    assert recipient_view["etiquette"]["viewer_role"] == "recipient"
    assert recipient_view["etiquette"]["window"]["set"] == true
    assert recipient_view["etiquette"]["decline_available"] == true

    # The window runs from when it was set (after the loop opened),
    # so the stage instants derive from the loop's own close.
    loop = loop_for(plan_id, recipient_id)
    {:ok, closes, _} = DateTime.from_iso8601(loop.metadata["window_closes_at"])
    total = DateTime.diff(closes, t0, :second)

    # Link 4 - grace passes (the stage entry the Oban job calls):
    # limbo reads back on the contract for both viewers, each with
    # their own finished copy.
    assert {:ok, :nudged} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(t0, div(total, 2) + 60, :second),
               stage: "awaiting"
             )

    creator_view = list_plan(tok_creator, plan_id)
    recipient_view = list_plan(tok_recipient, plan_id)

    assert creator_view["etiquette"]["stage"] == "nudged"
    assert creator_view["etiquette"]["limbo"]["state"] == "limbo"

    assert creator_view["etiquette"]["limbo"]["copy"] ==
             NonResponseEtiquette.limbo_sender_copy(title)

    assert recipient_view["etiquette"]["limbo"]["state"] == "limbo"

    assert recipient_view["etiquette"]["limbo"]["copy"] ==
             NonResponseEtiquette.limbo_recipient_copy(title)

    assert recipient_view["etiquette"]["limbo"]["pattern_channel"] == "cooling-lines"

    # Link 5 - expiry IS the fork, at window close.
    assert {:ok, :not_due} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(closes, -60, :second),
               stage: "nudged"
             )

    assert {:ok, :forked} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(closes, 1, :second),
               stage: "nudged"
             )

    forked_view = list_plan(tok_recipient, plan_id)
    assert forked_view["etiquette"]["fork"]["state"] == "presented"
    assert forked_view["etiquette"]["fork_available"] == true

    # The fork reached the recipient through the needs-you path with
    # both honorable choices.
    fork_notice =
      Enum.find(
        NonResponseEtiquette.needs_you(recipient_id),
        &(&1["copy"] == NonResponseEtiquette.fork_copy(title))
      )

    assert fork_notice

    assert Enum.map(fork_notice["actions"], & &1["id"]) == [
             "decline",
             "ask_another_time"
           ]

    # Link 6 - silence past the fork window (24h from the fork
    # instant) closes it, exactly once.
    assert {:ok, :closed, %{hold_released: true}} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(closes, 25 * @hour, :second),
               stage: "forked"
             )

    assert {:ok, :stale_job} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(closes, 49 * @hour, :second),
               stage: "forked"
             )

    assert Repo.aggregate(
             from(s in AttentionSignal,
               where: s.plan_id == ^plan_id and s.signal_type == "non_response_closure"
             ),
             :count
           ) == 2

    # Link 7 - both parties' closure notices read back through the
    # real needs-you path; the closure family is quiet information.
    assert Enum.any?(
             NonResponseEtiquette.needs_you(creator_id),
             &(&1["copy"] ==
                 NonResponseEtiquette.requester_closure_copy("I2 Sam", title))
           )

    assert Enum.any?(
             NonResponseEtiquette.needs_you(recipient_id),
             &(&1["copy"] == NonResponseEtiquette.recipient_closure_copy(title))
           )

    assert OpalCore.SocialFlow.ProductShell.signal_family("non_response_closure") ==
             "quiet_information"

    # Link 8 - the hold is released: a plain decline on the row, and
    # the 1:1 plan cancelled through the gate (reads back status=all).
    assert Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: recipient_id).response_state ==
             "declined"

    cancelled = list_plan(tok_creator, plan_id, "?status=all")
    assert cancelled["status"] == "cancelled"
    # A closed lifecycle carries no live etiquette fact anymore.
    assert cancelled["etiquette"] == nil
  end

  test "gate refusals surface as plain lines over HTTP, never silent drops", %{conn: conn} do
    {tok_creator, creator_id} = activate(conn, "I2 Gail", "i2_gail")
    {tok_outsider, outsider_id} = activate(build_conn(), "I2 Otto", "i2_otto")
    {_tok_third, third_id} = activate(build_conn(), "I2 Pam", "i2_pam")
    set_mode(outsider_id, "proactive")
    # No relationship row: the outsider is outside the creator's circle.

    created =
      graph_create(tok_creator, %{
        "title" => "I2 refusal dinner #{System.unique_integer([:positive])}",
        "participant_user_ids" => [outsider_id]
      })

    plan_id = created["plan"]["id"]

    conn =
      build_conn()
      |> auth(tok_creator)
      |> post("/api/v1/product/opal/plans/#{plan_id}/response-window", %{
        "recipient_id" => outsider_id,
        "window_seconds" => 48 * @hour
      })

    refused = json_response(conn, 422)
    assert refused["error_code"] == "outside_creator_circle"
    assert refused["message"] == NonResponseEtiquette.window_unavailable_circle_copy()
    # Nothing was written by the refused set.
    assert Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: outsider_id).response_window_closes_at ==
             nil

    # A non-creator on the plan cannot set one either: 403 + the line.
    make_circle(creator_id, outsider_id)

    conn =
      build_conn()
      |> auth(tok_outsider)
      |> post("/api/v1/product/opal/plans/#{plan_id}/response-window", %{
        "recipient_id" => outsider_id,
        "window_seconds" => 48 * @hour
      })

    forbidden = json_response(conn, 403)
    assert forbidden["message"] == NonResponseEtiquette.window_not_creator_copy()

    # An unknown plan id: 404, existence never revealed.
    _ = third_id

    conn =
      build_conn()
      |> auth(tok_creator)
      |> post(
        "/api/v1/product/opal/plans/#{Ecto.UUID.generate()}/response-window",
        %{"recipient_id" => outsider_id, "window_seconds" => 48 * @hour}
      )

    assert json_response(conn, 404)["error_code"] == "not_found"
  end

  test "the recipient's own decline answers through the respond endpoint", %{conn: conn} do
    {tok_creator, creator_id} = activate(conn, "I2 Dana", "i2_dana")
    {tok_recipient, recipient_id} = activate(build_conn(), "I2 Eli", "i2_eli")
    _ = creator_id

    created =
      graph_create(tok_creator, %{
        "title" => "I2 decline dinner #{System.unique_integer([:positive])}",
        "participant_user_ids" => [recipient_id]
      })

    plan = created["plan"]
    plan_id = plan["id"]

    # The creator cannot give the recipient's answer: there is no
    # invitation loop for the creator, the machinery answers
    # :not_found, and nothing is written by the attempt.
    conn =
      build_conn()
      |> auth(tok_creator)
      |> post("/api/v1/product/opal/plans/#{plan_id}/etiquette/respond", %{
        "action" => "decline"
      })

    assert json_response(conn, 404)["error_code"] == "not_found"

    assert Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: recipient_id).response_state ==
             "pending"

    conn =
      build_conn()
      |> auth(tok_recipient)
      |> post("/api/v1/product/opal/plans/#{plan_id}/etiquette/respond", %{
        "action" => "decline"
      })

    answered = json_response(conn, 200)
    assert answered["ok"] == true
    assert answered["outcome"] == "closed"

    assert Repo.get_by!(PlanParticipant, plan_id: plan_id, user_id: recipient_id).response_state ==
             "declined"

    # A recipient decline never cancels the plan and never carries an
    # on-behalf marker; the requester still gets their closure.
    listed = list_plan(tok_creator, plan_id)
    assert listed["status"] == "tentative"

    assert Enum.any?(
             NonResponseEtiquette.needs_you(creator_id),
             &(&1["signal_type"] == "non_response_closure")
           )
  end
end
