defmodule OpalCore.SocialFlow.ProviderEconomicContract do
  @moduledoc """
  Provider economic contract configuration (Pass 22).

  Separate from AttributionGraph and payout policy.
  Commission agreements are provider-specific and versioned.

  LIVE ECONOMIC CONTRACT: NOT CLAIMED — catalog is foundation/fixture only.
  """

  @catalog %{
    "synthetic_reservation" => [
      %{
        "provider" => "synthetic_reservation",
        "contract_version" => "syn-res-econ-0.1",
        "effective_from" => ~U[2026-01-01 00:00:00Z],
        "effective_to" => nil,
        "commission_model" => "fixed",
        "fixed_commission" => 15.0,
        "percent_commission" => nil,
        "currency" => "USD",
        "qualifies_on" => "commission_confirmed",
        "finality_on" => "transaction_settled",
        "zero_commission_allowed" => true,
        "partial_value_allowed" => true,
        "source_mode" => "synthetic",
        "live" => false
      }
    ],
    "recorded_reservation_econ" => [
      %{
        "provider" => "recorded_reservation_econ",
        "contract_version" => "rec-res-econ-0.1",
        "effective_from" => ~U[2026-01-01 00:00:00Z],
        "effective_to" => nil,
        "commission_model" => "fixed",
        "fixed_commission" => 12.0,
        "percent_commission" => nil,
        "currency" => "USD",
        "qualifies_on" => "commission_confirmed",
        "finality_on" => "transaction_settled",
        "zero_commission_allowed" => true,
        "partial_value_allowed" => true,
        "source_mode" => "recorded_fixture",
        "live" => false
      },
      # Later contract version — must not apply retroactively
      %{
        "provider" => "recorded_reservation_econ",
        "contract_version" => "rec-res-econ-0.2",
        "effective_from" => ~U[2027-01-01 00:00:00Z],
        "effective_to" => nil,
        "commission_model" => "percent",
        "fixed_commission" => nil,
        "percent_commission" => 0.08,
        "currency" => "USD",
        "qualifies_on" => "commission_confirmed",
        "finality_on" => "transaction_settled",
        "zero_commission_allowed" => true,
        "partial_value_allowed" => true,
        "source_mode" => "recorded_fixture",
        "live" => false
      }
    ]
  }

  def live_contracts?, do: false

  def catalog, do: @catalog

  @doc "Contract active at effective_at for provider."
  def resolve(provider, effective_at \\ DateTime.utc_now())

  def resolve(provider, effective_at) when is_binary(provider) do
    at = normalize_dt(effective_at)

    (@catalog[provider] || [])
    |> Enum.filter(fn c -> active?(c, at) end)
    |> Enum.sort_by(fn c -> c["effective_from"] end, {:desc, DateTime})
    |> List.first()
    |> case do
      nil -> {:error, :no_contract}
      c -> {:ok, c}
    end
  end

  def resolve(_, _), do: {:error, :invalid}

  @doc "Explicit version lookup — historic qualification explainability."
  def get_version(provider, version) when is_binary(provider) and is_binary(version) do
    case Enum.find(@catalog[provider] || [], &(&1["contract_version"] == version)) do
      nil -> {:error, :unknown_contract_version}
      c -> {:ok, c}
    end
  end

  def get_version(_, _), do: {:error, :invalid}

  @doc "Compute expected commission under contract (not payout)."
  def expected_commission(contract, opts \\ %{})

  def expected_commission(contract, opts) when is_map(contract) do
    c = stringify(contract)
    o = stringify(opts || %{})

    case c["commission_model"] do
      "fixed" ->
        {:ok, c["fixed_commission"] || 0.0}

      "percent" ->
        gross = o["gross_value"]

        if is_number(gross) and is_number(c["percent_commission"]) do
          {:ok, Float.round(gross * c["percent_commission"], 2)}
        else
          {:error, :gross_value_required}
        end

      _ ->
        {:error, :unknown_commission_model}
    end
  end

  def expected_commission(_, _), do: {:error, :invalid}

  defp active?(c, at) do
    from = c["effective_from"]
    to = c["effective_to"]

    from_ok =
      case from do
        %DateTime{} = d -> DateTime.compare(at, d) != :lt
        _ -> true
      end

    to_ok =
      case to do
        nil -> true
        %DateTime{} = d -> DateTime.compare(at, d) == :lt
        _ -> true
      end

    from_ok and to_ok
  end

  defp normalize_dt(%DateTime{} = d), do: d

  defp normalize_dt(s) when is_binary(s) do
    case DateTime.from_iso8601(s) do
      {:ok, dt, _} -> dt
      _ -> DateTime.utc_now()
    end
  end

  defp normalize_dt(_), do: DateTime.utc_now()

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
