defmodule OpalCore.SocialFlow.PhoneVerification.SyntheticAdapter do
  @moduledoc """
  Synthetic development verification — never production SMS.

  Codes are deterministic fixtures for approved numbers; generic fallback for
  local non-fixture numbers when fixture-only is off.
  """

  @behaviour OpalCore.SocialFlow.PhoneVerification.Provider

  @synthetic_codes %{
    "+12025550101" => "111111",
    "+12025550102" => "222222",
    "+12025550103" => "333333",
    "+12025550104" => "444444",
    "+12025550105" => "555555",
    "+12025550106" => "666666",
    "+12025550107" => "777777",
    "+12025550108" => "888888"
  }

  @impl true
  def start_challenge(e164, _context) when is_binary(e164) do
    code = Map.get(@synthetic_codes, e164, "000000")
    digest_prefix = :crypto.hash(:sha256, e164) |> Base.encode16(case: :lower) |> String.slice(0, 8)

    {:ok,
     %{
       provider_reference: "synthetic-sms-#{digest_prefix}",
       provider: "synthetic_development",
       synthetic_code: code,
       message: "Your number verification was started."
     }}
  end

  @impl true
  def check_challenge(_provider_reference, _code, _context), do: :ok

  def synthetic_code(e164), do: Map.get(@synthetic_codes, e164, "000000")

  def fixture_number?(e164), do: Map.has_key?(@synthetic_codes, e164)
end
