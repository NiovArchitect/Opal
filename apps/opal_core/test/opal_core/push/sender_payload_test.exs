defmodule OpalCore.Push.SenderPayloadTest do
  use ExUnit.Case, async: false

  import ExUnit.CaptureLog

  alias OpalCore.Push.Adapters.APNS
  alias OpalCore.Push.Adapters.FCM
  alias OpalCore.Push.Adapters.Synthetic
  alias OpalCore.Push.Payload
  alias OpalCore.Push.Sender

  setup do
    previous_adapter = Application.get_env(:opal_core, :push_adapter)
    previous_apns = Application.get_env(:opal_core, :apns)
    previous_fcm = Application.get_env(:opal_core, :fcm)

    Application.put_env(:opal_core, :push_adapter, :auto)
    Application.delete_env(:opal_core, :apns)
    Application.delete_env(:opal_core, :fcm)

    on_exit(fn ->
      restore(:push_adapter, previous_adapter)
      restore(:apns, previous_apns)
      restore(:fcm, previous_fcm)
    end)

    :ok
  end

  defp restore(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore(key, val), do: Application.put_env(:opal_core, key, val)

  test "synthetic adapter returns {:ok, :synthetic} and logs user/platform/title" do
    prev = Logger.level()
    Logger.configure(level: :info)

    log =
      try do
        capture_log(fn ->
          assert {:ok, :synthetic} =
                   Synthetic.send(
                     "tok-synth-abcdef12",
                     %{title: "Fort Oak", body: "Needs your answer"},
                     user_id: "walk-b",
                     platform: "ios"
                   )
        end)
      after
        Logger.configure(level: prev)
      end

    assert log =~ "push.synthetic"
    assert log =~ "user_id=walk-b"
    assert log =~ "platform=ios"
    assert log =~ "Fort Oak"
    refute log =~ "delivered"
    refute log =~ ":sent"
  end

  test "oversize payload truncates body and never crashes" do
    huge = String.duplicate("x", 20_000)

    payload =
      Payload.build(%{
        title: "Update",
        body: huge,
        data: %{"attention_item_id" => "abc", "level" => "urgent"}
      })

    assert is_binary(payload.body)
    assert byte_size(payload.body) < 20_000
    assert Payload.encoded_size(payload) <= 4096
    assert payload.data["attention_item_id"] == "abc"
    assert payload.data["level"] == "urgent"
  end

  test "missing APNs credentials → Synthetic fallback with warn (no fake success)" do
    refute APNS.credentials_present?()

    log =
      capture_log(fn ->
        adapter = Sender.resolve_adapter(platform: "ios")
        assert adapter == Synthetic

        assert {:ok, :synthetic} =
                 Sender.send("tok-ios-abcdef12", %{title: "Hi", body: "There"},
                   platform: "ios",
                   user_id: "u1"
                 )
      end)

    assert log =~ "push.credentials_absent"
    assert log =~ "synthetic"
    refute log =~ "push.apns sent"
  end

  test "missing FCM credentials → Synthetic fallback with warn" do
    refute FCM.credentials_present?()

    log =
      capture_log(fn ->
        assert Sender.resolve_adapter(platform: "android") == Synthetic
      end)

    assert log =~ "push.credentials_absent"
  end

  test "APNs adapter refuses fake success when credentials absent" do
    log =
      capture_log(fn ->
        assert {:error, :credentials_absent} =
                 APNS.send("tok", %{title: "t", body: "b"}, [])
      end)

    assert log =~ "credentials_absent"
    assert log =~ "refusing fake success"
  end

  test "FCM adapter refuses fake success when credentials absent" do
    log =
      capture_log(fn ->
        assert {:error, :credentials_absent} =
                 FCM.send("tok", %{title: "t", body: "b"}, [])
      end)

    assert log =~ "credentials_absent"
    assert log =~ "refusing fake success"
  end

  test "no *_score fields in payload data" do
    payload =
      Payload.build(%{
        title: "Fort Oak",
        body: "Needs your answer",
        data: %{"attention_item_id" => "id-1", "level" => "attention"}
      })

    keys = Map.keys(payload.data)
    refute Enum.any?(keys, &String.ends_with?(&1, "_score"))
  end
end
