defmodule OpalCoreWeb.Repair19Ja02PrivateProjectionsTest do
  @moduledoc """
  Repair #19 W20 (JA-02) — FIX-A's creator-only private predicate at
  the four aggregate projections the journey audit named: NextPlan,
  ConversationAlignment's read output, Reveal, and HomeProjection.

  These projections re-read the plan's CURRENT row on every load,
  so before this fix a participant's live payloads kept updating
  with title/time/place the creator set AFTER privatizing — new
  disclosure, not retained history. After privatization:

  - the participant's aggregate payloads carry none of the plan's
    title/time/place in any of the four projections;
  - the creator's own payloads are unchanged;
  - the thread's own message record (the bounded exception — the
    parties' conversation history is not a plan projection) is
    unchanged;
  - GraphPeople's counts-only counters are out of scope by the
    audit's named exception and are not asserted here.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.HomeProjection
  alias OpalCore.SocialFlow.NextPlan
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.Reveal
  alias OpalCore.SocialFlow.SharedPlan

  @a "+12025550401"
  @b "+12025550402"

  setup do
    FixturesHelper.seed!()
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

  defp activate(phone, name, handle) do
    conn =
      post(build_conn(), "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "ja02-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(build_conn(), "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp get_json(token, path) do
    build_conn() |> auth(token) |> get(path) |> json_response(200)
  end

  defp post_json(token, path, params, status \\ 201) do
    build_conn() |> auth(token) |> post(path, params) |> json_response(status)
  end

  defp world do
    {token_a, user_a} = activate(@a, "JA02 A", "ja02_a")
    {token_b, user_b} = activate(@b, "JA02 B", "ja02_b")

    conv =
      post_json(token_a, "/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})[
        "conversation_id"
      ]

    plan =
      post_json(token_a, "/api/v1/product/conversations/#{conv}/plans", %{
        "title" => "Dinner at Juniper",
        "place" => "Juniper and Ivy",
        "location" => "Juniper and Ivy",
        "time_label" => "Saturday 7:30 PM"
      })["plan"]

    # A pre-privatization shared message in the thread itself.
    post_json(token_a, "/api/v1/product/conversations/#{conv}/messages", %{
      "body" => "See you at Juniper on Saturday!"
    })

    %{
      token_a: token_a,
      user_a: user_a,
      token_b: token_b,
      user_b: user_b,
      conv: conv,
      plan_id: plan["id"]
    }
  end

  defp reveal_plan_items(viewer_id, plan_id) do
    Reveal.for_viewer(viewer_id)["items"]
    |> Enum.filter(&(&1["plan_id"] == plan_id))
  end

  test "privatize seals all four aggregate projections for the participant; creator unchanged; thread history unchanged" do
    w = world()
    plan = Repo.get(SharedPlan, w.plan_id)

    # Sanity (pre-privatization): the participant's live payloads
    # DO carry the plan — the seal below is a change, not a void.
    assert %{"title" => "Dinner at Juniper"} =
             NextPlan.for_conversation(w.user_b, w.conv)

    assert reveal_plan_items(w.user_b, w.plan_id) != []
    creator_reveals_before = reveal_plan_items(w.user_a, w.plan_id)

    assert %{"title" => "Dinner at Juniper"} =
             HomeProjection.from_plan_row(plan, w.conv, 2, viewer_id: w.user_b)

    b_row =
      Messages.list_conversations(w.user_b) |> Enum.find(&(&1["id"] == w.conv))

    assert b_row["next_plan"]["title"] == "Dinner at Juniper"

    # Privatize, then change the plan's facts AFTER privatizing —
    # the new-disclosure case the audit ruled a defect.
    assert {:ok, _} = SocialFlow.set_plan_private(w.plan_id, w.user_a, true)

    plan
    |> SharedPlan.changeset(%{
      "title" => "Secret new title",
      "location" => "Undisclosed place",
      "time_label" => "Sunday 9:00 PM"
    })
    |> Repo.update!()

    # 1. NextPlan — participant sealed (conversation AND peer legs),
    # creator unchanged.
    assert NextPlan.for_conversation(w.user_b, w.conv) == nil
    assert NextPlan.for_peer(w.user_b, w.user_a) == nil
    assert %{"title" => "Secret new title"} = NextPlan.for_conversation(w.user_a, w.conv)

    # 2. Reveal — no reveal item for the plan for the participant;
    # the creator's reveal payload is exactly what it was before
    # privatization (Reveal gives a lead no item for a fully-formed
    # tentative plan — unchanged means unchanged, here [] == []).
    assert reveal_plan_items(w.user_b, w.plan_id) == []
    assert reveal_plan_items(w.user_a, w.plan_id) == creator_reveals_before

    # 3. HomeProjection — both entry points sealed for the
    # participant, unchanged for the creator.
    plan = Repo.get(SharedPlan, w.plan_id)
    assert HomeProjection.from_plan_row(plan, w.conv, 2, viewer_id: w.user_b) == nil

    assert %{"title" => "Secret new title"} =
             HomeProjection.from_plan_row(plan, w.conv, 2, viewer_id: w.user_a)

    locked_alignment = %{
      "exact_time" => %{"state" => "locked", "value" => "9:00 PM"},
      "place" => %{"state" => "locked", "value" => "Undisclosed place"},
      "date" => %{"value" => "Sunday"},
      "commitment" => "aligned",
      "lineage_id" => w.plan_id
    }

    assert HomeProjection.from_alignment(locked_alignment, w.conv, 2,
             viewer_id: w.user_b
           ) == nil

    assert %{"place" => "Undisclosed place"} =
             HomeProjection.from_alignment(locked_alignment, w.conv, 2,
               viewer_id: w.user_a
             )

    # The chats-list row (HomeProjection's plan feed in the real
    # payload): participant carries no plan card and no next_plan;
    # the creator's row still carries the plan.
    b_row =
      Messages.list_conversations(w.user_b) |> Enum.find(&(&1["id"] == w.conv))

    assert b_row["next_plan"] == nil
    assert b_row["plan_projection"] == nil

    a_row =
      Messages.list_conversations(w.user_a) |> Enum.find(&(&1["id"] == w.conv))

    assert a_row["next_plan"]["title"] == "Secret new title"

    # 4. ConversationAlignment read output (the thread alignment
    # endpoint): participant payload is sealed — no place
    # projection, no locked place/time values, no next_plan;
    # creator payload unchanged.
    b_align = get_json(w.token_b, "/api/v1/product/conversations/#{w.conv}/alignment")
    assert b_align["next_plan"] == nil
    refute Map.has_key?(b_align["alignment"], "place_projection")
    assert b_align["alignment"]["place"]["value"] == nil
    assert b_align["alignment"]["exact_time"]["value"] == nil

    a_align = get_json(w.token_a, "/api/v1/product/conversations/#{w.conv}/alignment")
    assert a_align["next_plan"]["title"] == "Secret new title"
    assert a_align["alignment"]["place_projection"]["label"] == "Undisclosed place"

    # Bounded exception: the thread's own message record is NOT
    # rewritten — pre-privatization shared history stays readable
    # by the participant, verbatim.
    b_msgs = get_json(w.token_b, "/api/v1/product/conversations/#{w.conv}/messages")
    bodies = Enum.map(b_msgs["messages"], & &1["body"])
    assert "See you at Juniper on Saturday!" in bodies
  end
end
