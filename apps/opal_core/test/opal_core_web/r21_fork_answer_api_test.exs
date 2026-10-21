defmodule OpalCoreWeb.R21ForkAnswerApiTest do
  @moduledoc """
  Repair #21 (W-5a) - the contract pins behind the fork-answer
  surface. The web control renders ONLY from the plan contract's
  etiquette projection, so these pins hold the projection to the
  exact truth the control consumes:

  - at the nudged/forked stages the RECIPIENT's projection carries
    `fork_available: true` (and the fork copy on their limbo);
  - the SENDER's projection never carries it (`fork_available:
    false`, role requester) - there is no answer for them to give;
  - a group member who is neither party never carries it either;
  - after the recipient answers through the real respond endpoint
    (decline, and ask-another-time), the projection stops offering
    the fork to everyone; on a two-person plan (no second pending
    recipient's loop) the lifecycle itself reads closed for both
    parties - in a group plan another recipient's still-open loop
    keeps the creator's lifecycle honestly open;
  - the sender cannot answer the recipient's fork through the
    endpoint - the attempt changes nothing.
  """
  use OpalCoreWeb.ConnCase, async: false

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{NonResponseEtiquette, TemporalFollowThroughLoop}

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
        "idempotency_key" => "r21f-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  # Open a plan and drive its lifecycle to the forked stage (the
  # stage entry the Oban job calls, pinned clock - the repo pattern).
  defp forked_plan(conn, suffix), do: build_forked_plan(conn, suffix, true)

  # Same drive, but a two-person plan: the recipient is the ONLY
  # pending participant, so their answer closes the plan's whole
  # etiquette lifecycle (no second recipient's loop remains open).
  defp forked_plan_two(conn, suffix), do: build_forked_plan(conn, suffix, false)

  defp build_forked_plan(conn, suffix, with_third?) do
    {tok_creator, creator_id} = activate(conn, "R21F Cara #{suffix}", "r21f_cara#{suffix}")

    {tok_recipient, recipient_id} =
      activate(build_conn(), "R21F Sam #{suffix}", "r21f_sam#{suffix}")

    {tok_third, third_id} = activate(build_conn(), "R21F Pam #{suffix}", "r21f_pam#{suffix}")

    # No quiet-hours window, so the pinned-clock stage advances land
    # (the I2 chain test's setup, for the same reason).
    {:ok, _} =
      OpalCore.SocialFlow.FollowThrough.update_preferences(recipient_id, %{
        assistance_level: "proactive",
        timezone: "UTC",
        quiet_hours_start: "12:00",
        quiet_hours_end: "12:00"
      })

    participant_ids = if with_third?, do: [recipient_id, third_id], else: [recipient_id]

    created =
      graph_create(tok_creator, %{
        "title" => "R21F fork dinner #{suffix} #{System.unique_integer([:positive])}",
        "participant_user_ids" => participant_ids
      })

    plan_id = created["plan"]["id"]
    loop = loop_for(plan_id, recipient_id)
    {:ok, t0, _} = DateTime.from_iso8601(loop.metadata["requested_at"])

    assert {:ok, :nudged} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(t0, 25 * @hour, :second),
               stage: "awaiting"
             )

    assert {:ok, :forked} =
             NonResponseEtiquette.advance(loop.id,
               now: DateTime.add(t0, 73 * @hour, :second),
               stage: "nudged"
             )

    %{
      plan_id: plan_id,
      creator: {tok_creator, creator_id},
      recipient: {tok_recipient, recipient_id},
      third: {tok_third, third_id}
    }
  end

  defp respond(token, plan_id, action) do
    build_conn()
    |> auth(token)
    |> post("/api/v1/product/opal/plans/#{plan_id}/etiquette/respond", %{"action" => action})
  end

  test "fork_available is the recipient's alone while the fork is live", %{conn: conn} do
    %{
      plan_id: plan_id,
      creator: {tok_creator, _},
      recipient: {tok_recipient, _},
      third: {tok_third, _}
    } =
      forked_plan(conn, "a")

    recipient_view = list_plan(tok_recipient, plan_id)
    assert recipient_view["etiquette"]["viewer_role"] == "recipient"
    assert recipient_view["etiquette"]["fork_available"] == true
    assert recipient_view["etiquette"]["fork"]["state"] == "presented"
    assert recipient_view["etiquette"]["lifecycle_open"] == true

    creator_view = list_plan(tok_creator, plan_id)
    assert creator_view["etiquette"]["viewer_role"] == "requester"
    assert creator_view["etiquette"]["fork_available"] == false
    assert creator_view["etiquette"]["fork"]["available"] == false

    # The third participant is on the plan but the fork is not theirs.
    third_view = list_plan(tok_third, plan_id)
    assert third_view["etiquette"]["fork_available"] == false
  end

  test "the sender cannot answer the recipient's fork; the recipient's ask-another-time resolves it",
       %{conn: conn} do
    %{plan_id: plan_id, creator: {tok_creator, _}, recipient: {tok_recipient, _}} =
      forked_plan(conn, "b")

    # The sender tries to decline on the recipient's behalf: refused
    # by the machinery (404 existence-hiding - no loop exists for
    # the sender - or a 403/422 refusal line), and the fork stays
    # live for its actual recipient.
    refused = respond(tok_creator, plan_id, "decline")
    assert refused.status in [403, 404, 422]

    still_live = list_plan(tok_recipient, plan_id)
    assert still_live["etiquette"]["fork_available"] == true

    answered = respond(tok_recipient, plan_id, "ask_another_time") |> json_response(200)
    assert answered["outcome"] == "another_time"

    # After the answer, no viewer is offered the fork again, and no
    # viewer's projection presents it.
    for token <- [tok_creator, tok_recipient] do
      view = list_plan(token, plan_id)
      assert is_nil(view["etiquette"]) or view["etiquette"]["fork_available"] == false
      assert is_nil(view["etiquette"]) or view["etiquette"]["fork"]["state"] != "presented"
    end

    # Group truth, pinned deliberately: this plan carries a SECOND
    # pending recipient whose own loop was never forked and is still
    # open, so the creator's lifecycle honestly stays open - the
    # lifecycle flag is per-loop truth, not fork truth. (The
    # two-person test below pins lifecycle closure itself.)
    creator_view = list_plan(tok_creator, plan_id)
    assert creator_view["etiquette"]["lifecycle_open"] == true
    assert creator_view["etiquette"]["stage"] == "awaiting"
  end

  test "on a two-person plan the recipient's answer closes the lifecycle for both parties",
       %{conn: conn} do
    %{plan_id: plan_id, creator: {tok_creator, _}, recipient: {tok_recipient, _}} =
      forked_plan_two(conn, "d")

    answered = respond(tok_recipient, plan_id, "ask_another_time") |> json_response(200)
    assert answered["outcome"] == "another_time"

    # No loop remains open on the plan, so no viewer's projection
    # offers the fork or reports an open lifecycle.
    for token <- [tok_creator, tok_recipient] do
      view = list_plan(token, plan_id)
      assert is_nil(view["etiquette"]) or view["etiquette"]["fork_available"] == false
      assert is_nil(view["etiquette"]) or view["etiquette"]["lifecycle_open"] == false
    end
  end

  test "the recipient's decline resolves the fork for everyone", %{conn: conn} do
    %{plan_id: plan_id, creator: {tok_creator, _}, recipient: {tok_recipient, _}} =
      forked_plan(conn, "c")

    answered = respond(tok_recipient, plan_id, "decline") |> json_response(200)
    assert answered["outcome"] == "closed"

    for token <- [tok_creator, tok_recipient] do
      view = list_plan(token, plan_id, "?status=all")
      assert is_nil(view["etiquette"]) or view["etiquette"]["fork_available"] == false
    end
  end
end
