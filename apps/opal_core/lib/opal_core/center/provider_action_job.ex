defmodule OpalCore.Center.ProviderActionJob do
  @moduledoc """
  Durable Center provider work — language may not outrun this record.

  Status: queued | running | results_ready | failed | cancelled | superseded
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @statuses ~w(queued running results_ready failed cancelled superseded)

  schema "provider_action_jobs" do
    field :user_id, :binary_id
    field :conversation_id, :binary_id
    field :message_id, :binary_id
    field :plan_id, :binary_id
    field :kind, :string, default: "places_search"
    field :status, :string, default: "queued"
    field :provider, :string
    field :search_geography, :string
    field :request, :map, default: %{}
    field :planning_snapshot, :map, default: %{}
    field :result, :map
    field :error, :string
    field :started_at, :utc_datetime_usec
    field :finished_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(job, attrs) do
    job
    |> cast(attrs, [
      :user_id,
      :conversation_id,
      :message_id,
      :plan_id,
      :kind,
      :status,
      :provider,
      :search_geography,
      :request,
      :planning_snapshot,
      :result,
      :error,
      :started_at,
      :finished_at
    ])
    |> validate_required([:user_id, :kind, :status])
    |> validate_inclusion(:status, @statuses)
  end

  def to_public_contract(%__MODULE__{} = j) do
    %{
      "id" => j.id,
      "kind" => j.kind,
      "status" => j.status,
      "provider" => j.provider,
      "search_geography" => j.search_geography,
      "plan_id" => j.plan_id,
      "result" => public_result(j.result),
      "error" => j.error,
      "started_at" => datetime(j.started_at),
      "finished_at" => datetime(j.finished_at)
    }
  end

  defp public_result(%{"candidates" => cands} = r) when is_list(cands) do
    %{
      "candidates" => Enum.map(cands, &public_candidate/1),
      "search_geography" => r["search_geography"],
      "attribution" => r["attribution"],
      "provider" => r["provider"]
    }
  end

  defp public_result(other) when is_map(other), do: Map.drop(other, ["raw"])
  defp public_result(_), do: nil

  defp public_candidate(c) when is_map(c) do
    Map.take(c, [
      "id",
      "name",
      "address",
      "lat",
      "lon",
      "categories",
      "cuisine",
      "search_geography",
      "provider",
      "rating_available",
      "reservation_support"
    ])
  end

  defp public_candidate(_), do: %{}

  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime(_), do: nil
end
