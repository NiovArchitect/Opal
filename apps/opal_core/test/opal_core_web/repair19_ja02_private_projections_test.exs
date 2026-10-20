defmodule OpalCoreWeb.Repair19Ja02PrivateProjectionsTest do
  @moduledoc """
  Polish C P3 (per-viewer vault) - supersedes the JA-02 creator-global
  reading at the four aggregate projections: NextPlan,
  ConversationAlignment's read output, Reveal, and HomeProjection.

  Founder's rule: hiding is PER-VIEWER. When A vaults a shared plan:
  - A's OWN aggregate payloads carry none of the plan (it lives only
    in A's "My private graphs"): NextPlan nil, no reveal item, no
    HomeProjection card, the thread alignment sealed, the chats-list
    row carries no next_plan / plan card.
  - B's payloads are UNCHANGED - B keeps the plan, live, including
    facts A sets after marking (B's view is B's own), and B's
    contracts never carry A's marker (is_private stays false for B).
  - When B then vaults it for themselves, B's projections seal and
    A's (after A un-marks) are unchanged - both directions.
  - The thread's own message record is never rewritten by a mark.
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

  test "A vaulting seals A's four projections only; B unchanged with no marker; B vaulting seals B's; un-marking restores" do
    w = world()
    plan = Repo.get(SharedPlan, w.plan_id)

    # Sanity: both parties' live payloads carry the plan.
    assert %{"title" => "Dinner at Juniper"} = NextPlan.for_conversation(w.user_b, w.conv)
    assert %{"title" => "Dinner at Juniper"} = NextPlan.for_conversation(w.user_a, w.conv)
    assert reveal_plan_items(w.user_b, w.plan_id) != []

    assert %{"title" => "Dinner at Juniper"} =
             HomeProjection.from_plan_row(plan, w.conv, 2, viewer_id: w.user_b)

    # A vaults the plan for themselves, then the plan's facts change.
    assert {:ok, contract} = SocialFlow.set_plan_private(w.plan_id, w.user_a, true)
    assert contract["is_private"] == true

    plan
    |> SharedPlan.changeset(%{
      "title" => "Updated dinner title",
      "location" => "Updated place",
      "time_label" => "Sunday 9:00 PM"
    })
    |> Repo.update!()

    plan = Repo.get(SharedPlan, w.plan_id)

    # 1. NextPlan - sealed for the MARKER (A) on both legs; B's pick
    # is unchanged and carries the live (updated) plan.
    assert NextPlan.for_conversation(w.user_a, w.conv) == nil
    assert NextPlan.for_peer(w.user_a, w.user_b) == nil
    assert %{"title" => "Updated dinner title"} = NextPlan.for_conversation(w.user_b, w.conv)
    assert %{"title" => "Updated dinner title"} = NextPlan.for_peer(w.user_b, w.user_a)

    # 2. Reveal - no item for A; B's items remain.
    assert reveal_plan_items(w.user_a, w.plan_id) == []
    assert reveal_plan_items(w.user_b, w.plan_id) != []

    # 3. HomeProjection - nil card for A; B's card unchanged (live).
    assert HomeProjection.from_plan_row(plan, w.conv, 2, viewer_id: w.user_a) == nil

    assert %{"title" => "Updated dinner title"} =
             HomeProjection.from_plan_row(plan, w.conv, 2, viewer_id: w.user_b)

    locked_alignment = %{
      "exact_time" => %{"state" => "locked", "value" => "9:00 PM"},
      "place" => %{"state" => "locked", "value" => "Updated place"},
      "date" => %{"value" => "Sunday"},
      "commitment" => "aligned",
      "lineage_id" => w.plan_id
    }

    assert HomeProjection.from_alignment(locked_alignment, w.conv, 2, viewer_id: w.user_a) ==
             nil

    assert %{"place" => "Updated place"} =
             HomeProjection.from_alignment(locked_alignment, w.conv, 2, viewer_id: w.user_b)

    # Chats-list rows: A's row carries no plan; B's row carries it,
    # and B's plan contract shows NO marker from A's vault.
    a_row = Messages.list_conversations(w.user_a) |> Enum.find(&(&1["id"] == w.conv))
    assert a_row["next_plan"] == nil
    assert a_row["plan_projection"] == nil

    b_row = Messages.list_conversations(w.user_b) |> Enum.find(&(&1["id"] == w.conv))
    assert b_row["next_plan"]["title"] == "Updated dinner title"

    {:ok, b_plans} = SocialFlow.list_plans_for_user(w.user_b)
    b_plan_row = Enum.find(b_plans, &(&1["id"] == w.plan_id))
    assert b_plan_row["is_private"] == false

    # 4. ConversationAlignment read output: A's thread payload is
    # sealed (no place projection, no locked values, no next_plan);
    # B's is unchanged and live.
    a_align = get_json(w.token_a, "/api/v1/product/conversations/#{w.conv}/alignment")
    assert a_align["next_plan"] == nil
    refute Map.has_key?(a_align["alignment"], "place_projection")
    assert a_align["alignment"]["place"]["value"] == nil
    assert a_align["alignment"]["exact_time"]["value"] == nil

    b_align = get_json(w.token_b, "/api/v1/product/conversations/#{w.conv}/alignment")
    assert b_align["next_plan"]["title"] == "Updated dinner title"
    assert b_align["alignment"]["place_projection"]["label"] == "Updated place"

    # The thread's own message record is untouched for both parties.
    for token <- [w.token_a, w.token_b] do
      msgs = get_json(token, "/api/v1/product/conversations/#{w.conv}/messages")
      assert "See you at Juniper on Saturday!" in Enum.map(msgs["messages"], & &1["body"])
    end

    # Reverse direction: A un-marks (A's projections restore), then
    # B vaults it for themselves - B seals, A stays live.
    assert {:ok, _} = SocialFlow.set_plan_private(w.plan_id, w.user_a, false)
    assert %{"title" => "Updated dinner title"} = NextPlan.for_conversation(w.user_a, w.conv)

    assert {:ok, _} = SocialFlow.set_plan_private(w.plan_id, w.user_b, true)
    assert NextPlan.for_conversation(w.user_b, w.conv) == nil
    assert reveal_plan_items(w.user_b, w.plan_id) == []
    assert %{"title" => "Updated dinner title"} = NextPlan.for_conversation(w.user_a, w.conv)

    {:ok, a_plans} = SocialFlow.list_plans_for_user(w.user_a)
    assert Enum.find(a_plans, &(&1["id"] == w.plan_id))["is_private"] == false
  end
end
