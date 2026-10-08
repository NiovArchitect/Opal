defmodule OpalCoreWeb.IntelligenceProductApiTest do
  @moduledoc "Paste F — product intelligence HTTP (person memory / mediation / briefings)."
  use OpalCoreWeb.ConnCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Events.EventOutbox
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialMemory.{GroupDecisionState, PersonMemory, WeeklyBriefing}

  @alex "+12025550101"
  @jordan "+12025550102"

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

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "intel-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
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
    {body["session"]["access_token"], body["user"]["id"], body}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp seed_maya(account_id) do
    maya_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: maya_id,
        handle: "maya_" <> String.slice(maya_id, 0, 6),
        display_name: "Maya"
      })
      |> Repo.insert()

    {:ok, pm} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: account_id,
        person_id: maya_id,
        relationship_type: "close_friend",
        sentiment_trend: "positive",
        known_facts: %{
          "birthday" => %{
            "value" => "June 14",
            "source_note" => "you mentioned this in March",
            "provenance" => "stated",
            "confidence" => 0.9,
            "needs_revalidation" => false
          },
          "cuisine" => %{
            "value" => "Prefers quiet Italian",
            "provenance" => "observed",
            "confidence" => 0.7
          },
          "inferred_hobby" => %{
            "value" => "maybe surfing",
            "provenance" => "inferred",
            "confidence" => 0.4,
            "needs_revalidation" => true
          }
        },
        open_loops: [
          %{
            "id" => Ecto.UUID.generate(),
            "summary" => "Saturday dinner unconfirmed",
            "conversation_id" => Ecto.UUID.generate()
          }
        ]
      })
      |> Repo.insert()

    {maya_id, pm}
  end

  test "F1 person memory — Maya seed, patch, archive, confirm, foreign 404", %{conn: conn} do
    {token, account_id, _} = activate(conn, @alex, "Owner", "intel_owner_a")
    {maya_id, _} = seed_maya(account_id)

    # GET
    body =
      build_conn()
      |> auth(token)
      |> get("/api/v1/product/intelligence/people/#{maya_id}/memory")
      |> json_response(200)

    assert body["display_name"] == "Maya"
    assert body["relationship_type"] == "close_friend"
    assert Enum.any?(body["known_facts"], &(&1["key"] == "birthday"))
    assert is_list(body["rhythms"])
    assert is_list(body["important_dates"])
    assert is_list(body["open_loops"])
    assert is_list(body["learned_preferences"])

    # PATCH
    patched =
      build_conn()
      |> auth(token)
      |> patch("/api/v1/product/intelligence/people/#{maya_id}/facts/birthday", %{
        "value" => "June 15",
        "source_note" => "corrected by owner"
      })
      |> json_response(200)

    assert patched["fact"]["value"] == "June 15"
    assert patched["fact"]["provenance"] == "stated"

    # confirm inferred → stated
    confirmed =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/intelligence/people/#{maya_id}/facts/inferred_hobby/confirm", %{
        "action" => "confirm"
      })
      |> json_response(200)

    assert confirmed["fact"]["provenance"] == "stated"

    # DELETE without confirm
    build_conn()
    |> auth(token)
    |> delete("/api/v1/product/intelligence/people/#{maya_id}/facts/cuisine")
    |> json_response(422)

    # DELETE with confirm → archive
    deleted =
      build_conn()
      |> auth(token)
      |> delete("/api/v1/product/intelligence/people/#{maya_id}/facts/cuisine?confirm=true")
      |> json_response(200)

    assert deleted["archived"] == true or deleted["deleted"] == true

    after_del =
      build_conn()
      |> auth(token)
      |> get("/api/v1/product/intelligence/people/#{maya_id}/memory")
      |> json_response(200)

    refute Enum.any?(after_del["known_facts"], &(&1["key"] == "cuisine"))

    # Foreign account → 404
    {token_b, _, _} = activate(build_conn(), @jordan, "Other", "intel_other_b")

    build_conn()
    |> auth(token_b)
    |> get("/api/v1/product/intelligence/people/#{maya_id}/memory")
    |> json_response(404)
  end

  test "F2 mediation — list/send/dismiss + outbox; foreign 404", %{conn: conn} do
    {token, account_id, _} = activate(conn, @alex, "Owner", "intel_med_a")
    conv = Ecto.UUID.generate()
    a = Ecto.UUID.generate()
    b = Ecto.UUID.generate()

    {:ok, state} =
      %GroupDecisionState{}
      |> GroupDecisionState.changeset(%{
        account_id: account_id,
        conversation_id: conv,
        topic: "Saturday dinner",
        consensus_status: "blocked",
        proposals: [
          %{
            "proposal_text" => "Rooftop 8pm",
            "supporters" => [a],
            "opponents" => []
          },
          %{
            "proposal_text" => "Juniper 7:30",
            "supporters" => [b],
            "opponents" => []
          }
        ],
        silent_participants: [],
        last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
        mediation_meta: %{"draft" => "Split — pick a lane?", "card_state" => "pending"}
      })
      |> Repo.insert()

    listed =
      build_conn()
      |> auth(token)
      |> get("/api/v1/product/intelligence/mediation")
      |> json_response(200)

    assert Enum.any?(listed["items"], &(&1["id"] == state.id))
    item = Enum.find(listed["items"], &(&1["id"] == state.id))
    assert item["status"] == "blocked"
    assert item["card_state"] == "pending"

    # conversation alias
    by_conv =
      build_conn()
      |> auth(token)
      |> get("/api/v1/product/intelligence/groups/#{conv}/mediation")
      |> json_response(200)

    assert by_conv["id"] == state.id

    sent =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/intelligence/mediation/#{state.id}/send", %{
        "draft" => "Edited draft for the group"
      })
      |> json_response(200)

    assert sent["ok"] == true
    assert sent["delivered_via"] == "owner_draft"

    assert Repo.exists?(
             from(o in EventOutbox, where: o.event_type == "intelligence.mediation.sent")
           )

    dismissed =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/intelligence/mediation/#{state.id}/dismiss", %{})
      |> json_response(200)

    assert dismissed["card_state"] == "dismissed"

    # Foreign
    {token_b, _, _} = activate(build_conn(), @jordan, "Other", "intel_med_b")

    build_conn()
    |> auth(token_b)
    |> get("/api/v1/product/intelligence/mediation/#{state.id}")
    |> json_response(404)
  end

  test "F3 briefings — current/past/dismiss + 404 next_briefing_at", %{conn: conn} do
    {token, account_id, _} = activate(conn, @alex, "Owner", "intel_brief_a")
    week_start = Date.beginning_of_week(Date.utc_today(), :monday)

    build_conn()
    |> auth(token)
    |> get("/api/v1/product/intelligence/briefings?current=1")
    |> json_response(404)
    |> then(fn body ->
      assert is_binary(body["next_briefing_at"])
    end)

    {:ok, briefing} =
      %WeeklyBriefing{}
      |> WeeklyBriefing.changeset(%{
        account_id: account_id,
        week_start: week_start,
        content: "Week ahead:\n- Maya coffee Tue\nStill open Saturday?",
        generated_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
        structured: %{
          "header" => "Your week ahead",
          "confirmed" => [%{"label" => "Maya coffee", "day" => "Tue"}],
          "still_open" => [
            %{"label" => "Saturday dinner", "link" => %{"kind" => "conversation", "id" => "c1"}}
          ],
          "tight_spots" => [],
          "suggestion" => %{"label" => "Leave Thursday free"},
          "question" => %{
            "label" => "Want Opal to draft Saturday options?",
            "link" => %{"kind" => "plan_create", "prefill" => "Draft Saturday"}
          }
        }
      })
      |> Repo.insert()

    current =
      build_conn()
      |> auth(token)
      |> get("/api/v1/product/intelligence/briefings?current=1")
      |> json_response(200)

    assert current["briefing"]["id"] == briefing.id
    assert current["briefing"]["question"]["link"]["kind"] == "plan_create"

    shown =
      build_conn()
      |> auth(token)
      |> get("/api/v1/product/intelligence/briefings/#{briefing.id}")
      |> json_response(200)

    assert shown["briefing"]["header"] == "Your week ahead"

    build_conn()
    |> auth(token)
    |> post("/api/v1/product/intelligence/briefings/#{briefing.id}/dismiss", %{})
    |> json_response(200)

    build_conn()
    |> auth(token)
    |> get("/api/v1/product/intelligence/briefings?current=1")
    |> json_response(404)
  end
end
