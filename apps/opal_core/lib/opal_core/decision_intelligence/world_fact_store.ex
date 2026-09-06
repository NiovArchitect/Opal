defmodule OpalCore.DecisionIntelligence.WorldFactStore do
  @moduledoc """
  Lightweight durable world facts for recomposition evidence (optional SoT aid).
  """

  use Ecto.Schema
  import Ecto.Changeset

  alias OpalCore.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "world_facts" do
    field :fact_type, :string
    field :entity_id, :string
    field :source, :string
    field :value, :map, default: %{}
    field :observed_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(%__MODULE__{} = row, attrs) do
    row
    |> cast(attrs, [:fact_type, :entity_id, :source, :value, :observed_at, :expires_at])
    |> validate_required([:fact_type, :entity_id, :source, :observed_at])
  end

  def put(attrs) when is_map(attrs) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %__MODULE__{}
    |> changeset(%{
      fact_type: attrs[:fact_type] || attrs["fact_type"],
      entity_id: to_string(attrs[:entity_id] || attrs["entity_id"]),
      source: attrs[:source] || attrs["source"] || "unknown",
      value: attrs[:value] || attrs["value"] || %{},
      observed_at: attrs[:observed_at] || attrs["observed_at"] || now,
      expires_at: attrs[:expires_at] || attrs["expires_at"]
    })
    |> Repo.insert()
  end
end
