defmodule OpalCore.AI.AiJobResult do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "ai_job_results" do
    field :status, :string
    field :output, :map
    field :model_metadata, :map
    field :safety, :map
    field :response_payload, :map
    field :schema_version, :string, default: "0.1.0"
    field :completed_at, :utc_datetime_usec

    belongs_to :ai_job, OpalCore.AI.AiJob

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(result, attrs) do
    result
    |> cast(attrs, [
      :ai_job_id,
      :status,
      :output,
      :model_metadata,
      :safety,
      :response_payload,
      :schema_version,
      :completed_at
    ])
    |> validate_required([:ai_job_id, :status, :completed_at])
    |> validate_inclusion(:status, ~w(completed refused failed))
    |> unique_constraint(:ai_job_id)
  end
end
