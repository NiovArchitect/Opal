defmodule OpalCore.Calls.TurnCredentialsTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Calls
  alias OpalCore.Calls.TurnCredentials
  alias OpalCore.Calls.TwilioNts
  alias OpalCore.Repo

  setup do
    previous_http = Application.get_env(:opal_core, :twilio_nts_http_client)
    previous_sid = System.get_env("OPAL_TWILIO_ACCOUNT_SID")
    previous_token = System.get_env("OPAL_TWILIO_AUTH_TOKEN")

    TurnCredentials.clear_cache!()

    on_exit(fn ->
      if is_nil(previous_http) do
        Application.delete_env(:opal_core, :twilio_nts_http_client)
      else
        Application.put_env(:opal_core, :twilio_nts_http_client, previous_http)
      end

      restore_env("OPAL_TWILIO_ACCOUNT_SID", previous_sid)
      restore_env("OPAL_TWILIO_AUTH_TOKEN", previous_token)
      TurnCredentials.clear_cache!()
    end)

    a =
      %User{}
      |> User.changeset(%{handle: "turn-a-#{System.unique_integer([:positive])}", display_name: "TurnA"})
      |> Repo.insert!()

    b =
      %User{}
      |> User.changeset(%{handle: "turn-b-#{System.unique_integer([:positive])}", display_name: "TurnB"})
      |> Repo.insert!()

    %{a: a, b: b}
  end

  defp restore_env(key, nil), do: System.delete_env(key)
  defp restore_env(key, val), do: System.put_env(key, val)

  defp mint_stub(_url, _headers) do
    {:ok,
     %{
       "username" => "nts-user",
       "password" => "nts-pass",
       "ttl" => "86400",
       "ice_servers" => [
         %{"urls" => "stun:global.stun.twilio.com:3478"},
         %{
           "urls" => "turn:global.turn.twilio.com:3478?transport=udp",
           "username" => "nts-user",
           "credential" => "nts-pass"
         },
         %{
           "urls" => "turns:global.turn.twilio.com:443?transport=tcp",
           "username" => "nts-user",
           "credential" => "nts-pass"
         }
       ]
     }}
  end

  test "returns disabled when Twilio account creds missing" do
    System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
    System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
    assert TwilioNts.mint() == {:disabled, "TURN not configured"}
  end

  test "mints ice_servers with turn: URIs when configured", %{a: a, b: b} do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "tokentest")
    Application.put_env(:opal_core, :twilio_nts_http_client, &mint_stub/2)

    assert {:ok, call} = Calls.invite(a.id, %{"callee_user_id" => b.id})
    assert {:ok, payload} = TurnCredentials.for_participant(call.id, a.id)
    assert payload["source"] == "twilio_nts"
    assert payload["ttl"] == 86_400
    urls =
      payload["ice_servers"]
      |> Enum.flat_map(fn s -> List.wrap(s["urls"]) end)
      |> Enum.join(" ")

    assert urls =~ "turn:"
    assert urls =~ "stun:"
  end

  test "reuses cached token within the same call", %{a: a, b: b} do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "tokentest")

    counter = :counters.new(1, [])

    Application.put_env(:opal_core, :twilio_nts_http_client, fn url, headers ->
      :counters.add(counter, 1, 1)
      mint_stub(url, headers)
    end)

    assert {:ok, call} = Calls.invite(a.id, %{"callee_user_id" => b.id})
    assert {:ok, first} = TurnCredentials.for_participant(call.id, a.id)
    assert {:ok, second} = TurnCredentials.for_participant(call.id, b.id)
    assert first["ice_servers"] == second["ice_servers"]
    assert :counters.get(counter, 1) == 1
  end

  test "stranger cannot mint credentials", %{a: a, b: b} do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "tokentest")
    Application.put_env(:opal_core, :twilio_nts_http_client, &mint_stub/2)

    stranger =
      %User{}
      |> User.changeset(%{handle: "turn-x-#{System.unique_integer([:positive])}", display_name: "X"})
      |> Repo.insert!()

    assert {:ok, call} = Calls.invite(a.id, %{"callee_user_id" => b.id})
    assert {:error, :forbidden} = TurnCredentials.for_participant(call.id, stranger.id)
  end
end
