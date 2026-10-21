defmodule OpalCoreWeb.R21MembershipApiTest do
  @moduledoc """
  Repair #21 (W-5b) - the group membership surface over HTTP:

  create a group -> read its membership projection -> multi-select
  add in one call -> the admin rule over DELETE (non-creator 403,
  leave 200, creator remove 200) -> the events read back on the
  thread contract's orbit. The conversation id never changes.
  """
  use OpalCoreWeb.ConnCase, async: false

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
        "idempotency_key" => "r21-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp call(token, method, path, params \\ %{}) do
    conn = build_conn() |> auth(token)

    case method do
      :get -> get(conn, path)
      :post -> post(conn, path, params)
      :delete -> delete(conn, path)
    end
  end

  test "group membership over HTTP: projection, multi-add, admin rule, orbit events", %{
    conn: conn
  } do
    {tok_a, a_id} = activate(conn, "R21 Ana", "r21_ana")
    {tok_b, b_id} = activate(build_conn(), "R21 Ben", "r21_ben")
    {_tok_c, c_id} = activate(build_conn(), "R21 Cleo", "r21_cleo")
    {_tok_d, d_id} = activate(build_conn(), "R21 Dan", "r21_dan")
    {_tok_e, e_id} = activate(build_conn(), "R21 Eve", "r21_eve")
    {tok_x, _x_id} = activate(build_conn(), "R21 Xan", "r21_xan")

    created =
      call(tok_a, :post, "/api/v1/product/conversations/group", %{
        "member_user_ids" => [b_id, c_id]
      })
      |> json_response(201)

    cid = created["conversation_id"]
    assert created["member_count"] == 3

    # The membership projection: the creator truth + per-viewer flags.
    membership =
      call(tok_a, :get, "/api/v1/product/conversations/#{cid}/membership")
      |> json_response(200)
      |> Map.get("membership")

    assert membership["conversation_id"] == cid
    assert membership["creator_user_id"] == a_id
    assert membership["viewer_is_creator"] == true
    assert length(membership["members"]) == 3

    # A non-member has no membership view into the conversation.
    call(tok_x, :get, "/api/v1/product/conversations/#{cid}/membership")
    |> json_response(403)

    # Multi-select add: two people, one action, same conversation.
    added =
      call(tok_a, :post, "/api/v1/product/conversations/#{cid}/members", %{
        "user_ids" => [d_id, e_id]
      })
      |> json_response(200)

    assert added["conversation_id"] == cid
    assert Enum.sort(added["added_ids"]) == Enum.sort([d_id, e_id])
    assert added["member_count"] == 5

    # The admin rule over HTTP: a non-creator removing another is 403.
    refused =
      call(tok_b, :delete, "/api/v1/product/conversations/#{cid}/members/#{c_id}")
      |> json_response(403)

    assert refused["error_code"] == "not_creator"

    # Anyone may leave.
    left =
      call(tok_b, :delete, "/api/v1/product/conversations/#{cid}/members/#{b_id}")
      |> json_response(200)

    assert left["left"] == true
    assert left["conversation_id"] == cid
    assert left["member_count"] == 4

    # The creator may remove another member.
    removed =
      call(tok_a, :delete, "/api/v1/product/conversations/#{cid}/members/#{c_id}")
      |> json_response(200)

    assert removed["removed_user_id"] == c_id
    assert removed["member_count"] == 3

    # The events are in the orbit the thread contract carries.
    thread =
      call(tok_a, :get, "/api/v1/product/conversations/#{cid}/messages")
      |> json_response(200)

    labels = Enum.map(thread["orbit"]["membership_events"], & &1["label"])
    assert "R21 Dan joined the conversation" in labels
    assert "R21 Eve joined the conversation" in labels
    assert "R21 Ben left the conversation" in labels
    assert "R21 Cleo was removed from the conversation" in labels
    assert thread["orbit"]["conversation_id"] == cid

    # And in the durable chronology on the same contract.
    chrono_labels =
      thread["chronology"]
      |> Enum.filter(&(&1["kind"] in ["member_added", "member_removed"]))
      |> Enum.map(& &1["label"])

    assert "R21 Dan joined the conversation" in chrono_labels
    assert "R21 Cleo was removed from the conversation" in chrono_labels
  end
end
