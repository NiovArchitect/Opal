defmodule OpalCoreWeb.Repair18Residuals2ChronologyTest do
  @moduledoc """
  Repair #18 real-path residuals #2 (FR-18-02-revision) - chronology
  read-after-confirm must not be stale.

  Live replay #3 evidence: the plan row and, eventually, the
  opal_chronology_moments table both carried "Thursday 8:00 PM", yet
  the GET messages response read immediately after the confirm still
  presented the 7:30 moment as the latest time_resolved. The revision
  moment was only recorded when a LATER message ran the chronology
  recorder, because the recorder ran before the alignment sync that
  settles the acceptance.

  This test drives the exact doors the regression suite uses (human
  message posts through the product API), then reads the messages
  response in the same turn - no follow-up message, no sleep - and
  asserts the latest time_resolved moment in the RESPONSE records the
  confirmed time.

  The defect is state-dependent: it only appears when the change is
  still PENDING at confirm time and the acceptance itself is what
  settles it. When the proposer is the plan lead, the propose turn
  direct-applies the new time and a later chronology pass catches up
  in time to mask the lag. So the thread's plan is staged the way the
  Mac walk plan stood: an AGREED plan at Thursday 7:30 PM led by the
  confirmer, so the proposer's change lands as a pending revision and
  the confirmer's message is the acceptance that settles it.
  """
  use OpalCoreWeb.ConnCase

  import Ecto.Query

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.{PlanParticipant, SharedPlan}

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
        "idempotency_key" => "r18r2-ch-#{handle}-#{System.unique_integer([:positive])}"
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
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp post_message(token, conversation_id, body) do
    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
        "body" => body,
        "client_message_id" => "r18r2-#{System.unique_integer([:positive])}"
      })

    json_response(conn, 201)
  end

  defp get_messages(token, conversation_id) do
    conn =
      build_conn()
      |> auth(token)
      |> get("/api/v1/product/conversations/#{conversation_id}/messages")

    json_response(conn, 200)
  end

  defp list_plans(token) do
    conn =
      build_conn()
      |> auth(token)
      |> get("/api/v1/product/opal/plans")

    json_response(conn, 200)["plans"] || []
  end

  defp latest_time_resolved_label(chronology) do
    chronology
    |> Enum.filter(&(Jason.encode!(&1) =~ "time_resolved"))
    |> List.last()
    |> case do
      nil -> nil
      moment -> moment["label"] || Jason.encode!(moment)
    end
  end

  test "messages response right after a confirmed time change names the new time as latest time_resolved" do
    {token_a, user_a} = activate(build_conn(), "+12025550101", "Proposer R2", "r18r2_prop")
    {token_b, user_b} = activate(build_conn(), "+12025550102", "Confirmer R2", "r18r2_conf")
    assert user_a != user_b

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})

    conversation_id = json_response(conn, 201)["conversation_id"]
    assert is_binary(conversation_id)

    post_message(
      token_a,
      conversation_id,
      "Let's do dinner at Juniper and Ivy on Thursday at 7:30 PM"
    )

    post_message(token_b, conversation_id, "Sounds good, 7:30 works for me")

    plan =
      Enum.find(list_plans(token_a), &(&1["conversation_id"] == conversation_id))

    plan =
      if plan do
        plan
      else
        conn =
          build_conn()
          |> auth(token_a)
          |> post("/api/v1/product/conversations/#{conversation_id}/plans", %{
            "title" => "Juniper and Ivy",
            "option_label" => "Juniper and Ivy",
            "place" => "Juniper and Ivy",
            "time_label" => "Thursday 7:30 PM"
          })

        json_response(conn, 201)["plan"]
      end

    assert is_map(plan), "a shared plan must exist in the thread"

    # Stage the Mac walk shape (see the moduledoc): an agreed plan at
    # Thursday 7:30 PM, led by the confirmer, so the proposer's change
    # is a pending revision until the confirmer accepts.
    plan_row = Repo.get!(SharedPlan, plan["id"])

    plan_row
    |> SharedPlan.changeset(%{
      "status" => "agreed",
      "time_label" => "Thursday 7:30 PM",
      "created_by_user_id" => user_b
    })
    |> Repo.update!()

    from(pp in PlanParticipant, where: pp.plan_id == ^plan_row.id)
    |> Repo.update_all(set: [role: "participant"])

    from(pp in PlanParticipant,
      where: pp.plan_id == ^plan_row.id and pp.user_id == ^user_b
    )
    |> Repo.update_all(set: [role: "lead"])

    post_message(token_a, conversation_id, "let's change dinner to 8 PM")
    post_message(token_b, conversation_id, "confirm 8 PM")

    # Immediate read-back in the same turn: no follow-up message may
    # be needed to make the chronology catch up with the acceptance.
    response = get_messages(token_a, conversation_id)
    latest = latest_time_resolved_label(response["chronology"] || [])

    assert is_binary(latest),
           "expected a time_resolved chronology moment in the messages response"

    assert latest =~ "8:00",
           "latest time_resolved must record the confirmed 8:00 PM; got: #{latest}"

    refute latest =~ "7:30",
           "latest time_resolved must not still present 7:30 PM; got: #{latest}"
  end
end
