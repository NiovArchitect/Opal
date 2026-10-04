defmodule OpalCore.Push.ExpoAdapterTest do
  @moduledoc """
  Phase 2C — Expo push adapter + token-prefix routing.
  """

  use OpalCore.DataCase, async: false
  use Oban.Testing, repo: OpalCore.Repo

  import ExUnit.CaptureLog

  alias OpalCore.Push.Adapters.Expo
  alias OpalCore.Push.Adapters.Synthetic
  alias OpalCore.Push.DeviceTokens
  alias OpalCore.Push.Sender
  alias OpalCore.Push.Workers.DeliverPushWorker

  @expo_token "ExponentPushToken[p2c-verify-token-abcdef]"
  @apns_token "apns-device-token-abcdef12"

  setup do
    previous_adapter = Application.get_env(:opal_core, :push_adapter)
    previous_http = Application.get_env(:opal_core, :expo_http_fun)

    Application.put_env(:opal_core, :push_adapter, :auto)

    on_exit(fn ->
      restore(:push_adapter, previous_adapter)
      restore(:expo_http_fun, previous_http)
    end)

    :ok
  end

  defp restore(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore(key, val), do: Application.put_env(:opal_core, key, val)

  test "Expo adapter success returns {:ok, :expo} and logs ticket id" do
    Application.put_env(:opal_core, :expo_http_fun, fn _url, _body, _headers ->
      {:ok,
       %{
         status: 200,
         body: %{"data" => %{"status" => "ok", "id" => "ticket-p2c-ok-1"}}
       }}
    end)

    prev = Logger.level()
    Logger.configure(level: :info)

    log =
      try do
        capture_log(fn ->
          assert {:ok, :expo} =
                   Expo.send(@expo_token, %{title: "Fort Oak", body: "Needs your answer"},
                     user_id: "walk-b",
                     platform: "ios"
                   )
        end)
      after
        Logger.configure(level: prev)
      end

    assert log =~ "push.expo ticket_ok"
    assert log =~ "ticket-p2c-ok-1"
  end

  test "Expo adapter ticket error returns {:error, ...} and logs verbatim" do
    Application.put_env(:opal_core, :expo_http_fun, fn _url, _body, _headers ->
      {:ok,
       %{
         status: 200,
         body: %{
           "data" => %{
             "status" => "error",
             "message" =>
               "\"ExponentPushToken[p2c-verify-token-abcdef]\" is not a registered push notification recipient",
             "details" => %{"error" => "DeviceNotRegistered"}
           }
         }
       }}
    end)

    log =
      capture_log(fn ->
        assert {:error, {:expo_ticket_error, ticket}} =
                 Expo.send(@expo_token, %{title: "t", body: "b"}, [])

        assert ticket["details"]["error"] == "DeviceNotRegistered"
      end)

    assert log =~ "push.expo ticket_error"
    assert log =~ "DeviceNotRegistered"
  end

  test "Sender routes ExponentPushToken prefix to Expo (not APNs/Synthetic)" do
    assert Sender.resolve_adapter(platform: "ios", token: @expo_token) == Expo
    assert Sender.resolve_adapter(platform: "ios", token: @apns_token) == Synthetic
  end

  test "worker delivers via Expo when Expo token present" do
    assert {:ok, _} =
             DeviceTokens.upsert("walk-b", %{
               "platform" => "ios",
               "token" => @expo_token,
               "env" => "production"
             })

    Application.put_env(:opal_core, :expo_http_fun, fn url, body, _headers ->
      assert url =~ "exp.host"
      decoded = Jason.decode!(body)
      assert decoded["to"] == @expo_token
      assert decoded["title"] == "Fort Oak"

      {:ok,
       %{
         status: 200,
         body: %{"data" => %{"status" => "ok", "id" => "ticket-worker-1"}}
       }}
    end)

    prev = Logger.level()
    Logger.configure(level: :info)

    log =
      try do
        capture_log(fn ->
          assert :ok =
                   perform_job(DeliverPushWorker, %{
                     "user_id" => "walk-b",
                     "title" => "Fort Oak",
                     "body" => "Needs your answer",
                     "data" => %{"level" => "urgent"}
                   })
        end)
      after
        Logger.configure(level: prev)
      end

    assert log =~ "push.expo ticket_ok"
    assert log =~ "ticket-worker-1"
    refute log =~ "push.synthetic"
  end

  test "worker falls back to synthetic when only non-Expo token and no APNs creds" do
    assert {:ok, _} =
             DeviceTokens.upsert("walk-a", %{
               "platform" => "ios",
               "token" => @apns_token,
               "env" => "sandbox"
             })

    prev = Logger.level()
    Logger.configure(level: :info)

    log =
      try do
        capture_log(fn ->
          assert :ok =
                   perform_job(DeliverPushWorker, %{
                     "user_id" => "walk-a",
                     "title" => "Plan",
                     "body" => "Needs your answer",
                     "data" => %{"level" => "attention"}
                   })
        end)
      after
        Logger.configure(level: prev)
      end

    assert log =~ "push.synthetic"
    refute log =~ "push.expo"
  end
end
