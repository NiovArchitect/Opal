defmodule OpalCoreWeb.Repair20OrbitApiTest do
  @moduledoc """
  Repair #20 (F-19) — the thread contract carries the ORBIT
  projection additively beside next_plan: the full party set and
  the thread's plans for the ring, from the same endpoint the
  thread already reads. A group thread's orbit carries every
  member; another conversation's orbit never leaks into this one.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @a "+12025550301"
  @b "+12025550302"
  @c "+12025550303"

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
        "idempotency_key" => "r20-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp direct(token, peer_id) do
    body =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => peer_id})
      |> json_response(201)

    body["conversation_id"]
  end

  defp create_plan(token, conversation_id, attrs) do
    body =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/conversations/#{conversation_id}/plans", attrs)
      |> json_response(201)

    body["plan"]
  end

  test "the thread contract carries the orbit: parties, stones, and the same next pick" do
    {token_a, user_a} = activate(@a, "Orbit A", "r20_a")
    {token_b, user_b} = activate(@b, "Orbit B", "r20_b")
    {token_c, user_c} = activate(@c, "Orbit C", "r20_c")

    group_id =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/group", %{
        "member_user_ids" => [user_b, user_c],
        "label" => "Orbit group"
      })
      |> json_response(201)
      |> Map.fetch!("conversation_id")

    plan =
      create_plan(token_a, group_id, %{
        "title" => "Orbit group dinner",
        "place" => "Juniper and Ivy",
        "location" => "Juniper and Ivy",
        "time_label" => "Saturday 7:30 PM"
      })

    thread = get_json(token_a, "/api/v1/product/conversations/#{group_id}/messages")
    orbit = thread["orbit"]
    assert orbit["conversation_id"] == group_id
    assert orbit["composition"] == "group"

    party_ids = MapSet.new(Enum.map(orbit["parties"], & &1["user_id"]))
    assert party_ids == MapSet.new([user_a, user_b, user_c])
    viewer = Enum.find(orbit["parties"], & &1["is_viewer"])
    assert viewer["user_id"] == user_a

    # Both invitees are pending on the plan; the stone carries it.
    stone = Enum.find(orbit["plans"], &(&1["plan_id"] == plan["id"]))
    assert stone["title"] == "Orbit group dinner"
    reads = Map.new(stone["participants"], &{&1["user_id"], &1})
    assert reads[user_b]["pending"] == true
    assert reads[user_c]["pending"] == true
    assert reads[user_a]["pending"] == false

    # The orbit's next-together is the thread's next_plan fact.
    assert orbit["next_plan"]["plan_id"] == thread["next_plan"]["plan_id"]

    # Isolation: a dyad with B carries its own orbit, group-free.
    dyad = direct(token_a, user_b)
    dyad_thread = get_json(token_a, "/api/v1/product/conversations/#{dyad}/messages")
    assert dyad_thread["orbit"]["composition"] == "dyad"
    assert length(dyad_thread["orbit"]["parties"]) == 2
    assert dyad_thread["orbit"]["plans"] == []
  end
end
