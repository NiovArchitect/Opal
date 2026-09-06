defmodule OpalCore.DecisionIntelligence.EventProcessingRecord do
  @moduledoc """
  Consumer idempotency + poison quarantine for recomposition events.
  """

  use Ecto.Schema
  import Ecto.Changeset

  alias OpalCore.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(processed quarantine error)

  schema "event_processing_records" do
    field :event_id, :string
    field :status, :string, default: "processed"
    field :error_class, :string
    field :processed_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(%__MODULE__{} = row, attrs) do
    row
    |> cast(attrs, [:event_id, :status, :error_class, :processed_at])
    |> validate_required([:event_id, :status, :processed_at])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint(:event_id)
  end

  def already_processed?(event_id) when is_binary(event_id) do
    case Repo.get_by(__MODULE__, event_id: event_id) do
      %__MODULE__{status: status} when status in ~w(processed quarantine) -> true
      _ -> false
    end
  end

  def already_processed?(_), do: false

  def record_processed(event_id) when is_binary(event_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %__MODULE__{}
    |> changeset(%{event_id: event_id, status: "processed", processed_at: now})
    |> Repo.insert(
      on_conflict: :nothing,
      conflict_target: [:event_id]
    )
  end

  def record_quarantine(event_id, error_class) when is_binary(event_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %__MODULE__{}
    |> changeset(%{
      event_id: event_id,
      status: "quarantine",
      error_class: to_string(error_class),
      processed_at: now
    })
    |> Repo.insert(
      on_conflict: {:replace, [:status, :error_class, :processed_at, :updated_at]},
      conflict_target: [:event_id]
    )
  end
end
