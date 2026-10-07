defmodule OpalCore.SocialFlow.PhoneVerifyModeTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.PhoneVerification.Provider

  setup do
    previous = Application.get_env(:opal_core, :phone_verify_mode)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  test "unknown mode fails closed to disabled" do
    Application.put_env(:opal_core, :phone_verify_mode, "not_a_real_mode")
    assert Provider.mode() == :disabled
    assert {:error, :verification_disabled} = Provider.start_challenge("+15555550100", %{})
  end

  test "production_sms does not silently become synthetic" do
    Application.put_env(:opal_core, :phone_verify_mode, :production_sms)
    assert Provider.mode() == :production_sms
    assert Provider.production_mode?()
    refute Provider.synthetic_mode?()
  end

  test "explicit synthetic stays synthetic even if Twilio env is present in process" do
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)
    assert Provider.mode() == :synthetic_development
    assert Provider.synthetic_mode?()
    refute Provider.production_mode?()
  end
end
