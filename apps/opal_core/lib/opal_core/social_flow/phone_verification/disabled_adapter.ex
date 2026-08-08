defmodule OpalCore.SocialFlow.PhoneVerification.DisabledAdapter do
  @moduledoc "Verification disabled — no challenges."

  @behaviour OpalCore.SocialFlow.PhoneVerification.Provider

  @impl true
  def start_challenge(_e164, _context), do: {:error, :verification_disabled}

  @impl true
  def check_challenge(_ref, _code, _context), do: {:error, :verification_disabled}
end
