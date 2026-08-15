defmodule OpalCore.SocialFlow.ProviderEconomicEventStore do
  @moduledoc """
  Durable Postgres store for provider economic events (Pass 23).

  Survives BEAM restart, deployment, multi-node processing, duplicate delivery, replay.

  Dedupe: unique index (provider, economic_event_id).
  source_mode is preserved — DB storage never implies LIVE.

  Not an accounting ledger. Not a wallet.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.ProviderEconomicEventRecord

  @doc "No-op for API compatibility with Pass 22 Agent API."
  def ensure_started, do: :ok

  @doc "Test helper — deletes all economic events in test DB."
  def reset! do
    Repo.delete_all(ProviderEconomicEventRecord)
    :ok
  end

  @doc """
  Insert event. Duplicate provider+economic_event_id returns existing (:idempotent).
  DB uniqueness is the multi-node authority.
  """
  def put(event) when is_map(event) do
    e = stringify(event)
    provider = e["provider"] || "unknown"
    event_id = e["economic_event_id"] || e["event_id"] || Ecto.UUID.generate()
    tx = e["transaction_id"] || e["provider_transaction_id"] || e["execution_id"] || event_id

    # Reject missing currency for value-bearing events
    if value_bearing?(e) and blank?(e["currency"]) do
      {:error, :currency_required}
    else
      attrs = %{
        provider: provider,
        economic_event_id: event_id,
        transaction_id: to_string(tx),
        execution_id: e["execution_id"],
        provider_transaction_id: e["provider_transaction_id"] || to_string(tx),
        provider_contract_version: e["provider_contract_version"],
        source_mode: e["source_mode"] || e["mode"] || "recorded_fixture",
        economic_event_type: e["economic_event_type"] || "unknown",
        transaction_type: e["transaction_type"],
        currency: e["currency"],
        commission_value: to_float(e["commission_value"]),
        commission_pool: to_float(e["commission_pool"] || e["commission_value"]),
        gross_value: to_float(e["gross_value"]),
        finality: e["finality"],
        status: e["status"],
        settlement_state: e["settlement_state"],
        completion: e["completion"] == true,
        experience_completed: e["experience_completed"] == true,
        cancelled: e["cancelled"] == true,
        partial: e["partial"] == true,
        live: false,
        observed_at: parse_dt(e["observed_at"]),
        effective_at: parse_dt(e["effective_at"]),
        settled_at: parse_dt(e["settled_at"]),
        reversal_reason: e["reversal_reason"],
        reversal_reference: e["reversal_reference"],
        raw_source_reference: e["raw_source_reference"],
        payload: Map.drop(e, ~w(payload))
      }

      %ProviderEconomicEventRecord{}
      |> ProviderEconomicEventRecord.changeset(attrs)
      |> Repo.insert()
      |> case do
        {:ok, row} ->
          {:ok, ProviderEconomicEventRecord.to_event_map(row), :created}

        {:error, %Ecto.Changeset{} = cs} ->
          if unique_error?(cs.errors) do
            case get(provider, event_id) do
              %{} = existing -> {:ok, existing, :idempotent}
              nil -> {:error, :idempotent_race}
            end
          else
            {:error, :invalid_event}
          end
      end
    end
  rescue
    e in [DBConnection.ConnectionError] ->
      {:error, {:db_unavailable, Exception.message(e)}}
  end

  def put(_), do: {:error, :invalid}

  def get(provider, economic_event_id)
      when is_binary(provider) and is_binary(economic_event_id) do
    case Repo.get_by(ProviderEconomicEventRecord,
           provider: provider,
           economic_event_id: economic_event_id
         ) do
      nil -> nil
      row -> ProviderEconomicEventRecord.to_event_map(row)
    end
  end

  def get(_, _), do: nil

  def history(transaction_id) when is_binary(transaction_id) do
    from(e in ProviderEconomicEventRecord,
      where: e.transaction_id == ^transaction_id,
      order_by: [asc: e.inserted_at, asc: e.observed_at]
    )
    |> Repo.all()
    |> Enum.map(&ProviderEconomicEventRecord.to_event_map/1)
  end

  def history(_), do: []

  def all_events do
    from(e in ProviderEconomicEventRecord, order_by: [asc: e.inserted_at])
    |> Repo.all()
    |> Enum.map(&ProviderEconomicEventRecord.to_event_map/1)
  end

  @doc "Source IDs for qualification audit linkage."
  def source_event_ids(transaction_id) when is_binary(transaction_id) do
    history(transaction_id)
    |> Enum.map(& &1["economic_event_id"])
  end

  def source_event_ids(_), do: []

  defp unique_error?(errors) do
    Enum.any?(errors, fn
      {_, {_, opts}} -> opts[:constraint] in [:unique, "unique"] or opts[:constraint_name] != nil
      _ -> false
    end)
  end

  defp value_bearing?(e) do
    e["economic_event_type"] in ~w(commission_confirmed commission_observed transaction_settled) and
      is_number(e["commission_value"] || e["commission_pool"]) and
      (e["commission_value"] || e["commission_pool"] || 0) > 0
  end

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(_), do: false

  defp to_float(nil), do: nil
  defp to_float(n) when is_float(n), do: n
  defp to_float(n) when is_integer(n), do: n * 1.0

  defp to_float(n) when is_binary(n) do
    case Float.parse(n) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp to_float(_), do: nil

  defp parse_dt(nil), do: nil
  defp parse_dt(%DateTime{} = d), do: DateTime.truncate(d, :microsecond)

  defp parse_dt(s) when is_binary(s) do
    case DateTime.from_iso8601(s) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
