defmodule OpalCore.SocialFlow.PhoneVerification.Provider do
  @moduledoc """
  Provider-neutral phone verification boundary for the Real People vertical.

  Modes (Application config `:opal_core, :phone_verify_mode`):
  - `:synthetic_development` — local/hosted fixtures only (default for dev/test)
  - `:production_sms` — real SMS verify adapter; never falls back to synthetic
  - `:disabled` — challenges rejected

  Public product truth: verification proves control of the number at that time,
  not legal identity.
  """

  @type e164 :: String.t()
  @type challenge_ref :: String.t()
  @type code :: String.t()

  @type start_ok :: %{
          required(:provider_reference) => String.t(),
          required(:provider) => String.t(),
          optional(:synthetic_code) => String.t(),
          optional(:message) => String.t()
        }

  @callback start_challenge(e164(), map()) ::
              {:ok, start_ok()} | {:error, atom()}

  @callback check_challenge(challenge_ref(), code(), map()) ::
              :ok | {:error, atom()}

  @doc "Active mode atom from config."
  def mode do
    case Application.get_env(:opal_core, :phone_verify_mode, :synthetic_development) do
      m when m in [:synthetic_development, :production_sms, :disabled] -> m
      "synthetic_development" -> :synthetic_development
      "production_sms" -> :production_sms
      "disabled" -> :disabled
      # R1A: unknown modes fail closed — never silent synthetic.
      _ -> :disabled
    end
  end

  def adapter do
    case mode() do
      :synthetic_development -> OpalCore.SocialFlow.PhoneVerification.SyntheticAdapter
      :production_sms -> production_adapter()
      :disabled -> OpalCore.SocialFlow.PhoneVerification.DisabledAdapter
    end
  end

  defp production_adapter do
    Application.get_env(
      :opal_core,
      :phone_verify_production_adapter,
      OpalCore.SocialFlow.PhoneVerification.TwilioVerifyAdapter
    )
  end

  @doc "Start a verification challenge via the active adapter."
  def start_challenge(e164, context \\ %{}) when is_binary(e164) and is_map(context) do
    case mode() do
      :disabled ->
        {:error, :verification_disabled}

      _ ->
        adapter().start_challenge(e164, context)
    end
  end

  @doc """
  Check a code.

  For synthetic mode, `challenge_ref` may be unused when digest verification
  is done in Onboarding; adapters may still implement check for symmetry.
  """
  def check_challenge(provider_reference, code, context \\ %{})
      when is_binary(provider_reference) and is_binary(code) and is_map(context) do
    case mode() do
      :disabled ->
        {:error, :verification_disabled}

      :synthetic_development ->
        # Onboarding continues to verify digests for synthetic challenges.
        :ok

      :production_sms ->
        adapter().check_challenge(provider_reference, code, context)
    end
  end

  def production_mode?, do: mode() == :production_sms
  def synthetic_mode?, do: mode() == :synthetic_development
end
