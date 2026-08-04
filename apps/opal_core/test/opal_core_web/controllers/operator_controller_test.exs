defmodule OpalCoreWeb.OperatorControllerTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SmokeResidue

  setup do
    previous = {
      System.get_env("OPAL_ALLOW_SMOKE_CLEANUP"),
      System.get_env("OPAL_SMOKE_CLEANUP_SECRET"),
      System.get_env("OPAL_SYNTHETIC_FIXTURE_ONLY")
    }

    on_exit(fn ->
      {allow, secret, synth} = previous
      restore("OPAL_ALLOW_SMOKE_CLEANUP", allow)
      restore("OPAL_SMOKE_CLEANUP_SECRET", secret)
      restore("OPAL_SYNTHETIC_FIXTURE_ONLY", synth)
    end)

    :ok
  end

  defp restore(key, nil), do: System.delete_env(key)
  defp restore(key, value), do: System.put_env(key, value)

  test "returns 404 when cleanup flag is off", %{conn: conn} do
    System.delete_env("OPAL_ALLOW_SMOKE_CLEANUP")
    System.put_env("OPAL_SMOKE_CLEANUP_SECRET", "test-secret-abcdef")
    System.put_env("OPAL_SYNTHETIC_FIXTURE_ONLY", "true")

    conn =
      conn
      |> put_req_header("x-opal-operator-secret", "test-secret-abcdef")
      |> post("/api/v1/operator/smoke-cleanup", %{"dry_run" => true})

    assert json_response(conn, 404)["error_code"] == "not_found"
  end

  test "returns 403 without matching operator secret", %{conn: conn} do
    System.put_env("OPAL_ALLOW_SMOKE_CLEANUP", "true")
    System.put_env("OPAL_SMOKE_CLEANUP_SECRET", "test-secret-abcdef")
    System.put_env("OPAL_SYNTHETIC_FIXTURE_ONLY", "true")

    conn = post(conn, "/api/v1/operator/smoke-cleanup", %{"dry_run" => true})
    assert json_response(conn, 403)["error_code"] == "forbidden"
  end

  test "dry run and delete only smoke residue under synthetic fixture policy", %{conn: conn} do
    System.put_env("OPAL_ALLOW_SMOKE_CLEANUP", "true")
    System.put_env("OPAL_SMOKE_CLEANUP_SECRET", "test-secret-abcdef")
    System.put_env("OPAL_SYNTHETIC_FIXTURE_ONLY", "true")

    uid = System.unique_integer([:positive])

    {:ok, u} =
      %User{}
      |> User.changeset(%{display_name: "T", handle: "op-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "op-#{uid}"})
      |> Repo.insert()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
    |> Repo.insert!()

    smoke =
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conv.id,
        sender_user_id: u.id,
        client_message_id: "op-smoke-1",
        message_type: "text",
        body: "SF17 live ping 999",
        server_seq: 1
      })
      |> Repo.insert!()

    keep =
      %Message{}
      |> Message.create_changeset(%{
        conversation_id: conv.id,
        sender_user_id: u.id,
        client_message_id: "op-keep-1",
        message_type: "text",
        body: "We should get dinner Thursday.",
        server_seq: 2
      })
      |> Repo.insert!()

    dry =
      conn
      |> put_req_header("x-opal-operator-secret", "test-secret-abcdef")
      |> post("/api/v1/operator/smoke-cleanup", %{"dry_run" => true})

    dry_body = json_response(dry, 200)
    assert dry_body["ok"] == true
    assert dry_body["dry_run"] == true
    assert dry_body["matched"] >= 1
    assert dry_body["deleted"] == 0
    assert Repo.get(Message, smoke.id)

    del =
      build_conn()
      |> put_req_header("x-opal-operator-secret", "test-secret-abcdef")
      |> post("/api/v1/operator/smoke-cleanup", %{"dry_run" => false})

    del_body = json_response(del, 200)
    assert del_body["ok"] == true
    assert del_body["dry_run"] == false
    assert del_body["deleted"] >= 1
    assert Repo.get(Message, smoke.id) == nil
    assert Repo.get(Message, keep.id)

    second =
      build_conn()
      |> put_req_header("x-opal-operator-secret", "test-secret-abcdef")
      |> post("/api/v1/operator/smoke-cleanup", %{"dry_run" => false})

    second_body = json_response(second, 200)
    assert second_body["matched"] == 0
    assert second_body["deleted"] == 0

    # Read filter still rejects smoke patterns even after physical cleanup path is exercised.
    assert SmokeResidue.smoke_body?("SF17 live ping 999")
  end
end
