defmodule OpalCore.Intelligence.Extraction do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "intelligence_extractions" do
    field :intent, :string
    field :entities, :map, default: %{}
    field :vibe, :map, default: %{}
    field :raw, :map, default: %{}
    field :latency_ms, :integer

    belongs_to :event, OpalCore.Intelligence.Event

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:event_id, :intent, :entities, :vibe, :raw, :latency_ms])
    |> validate_required([:event_id, :intent])
    |> foreign_key_constraint(:event_id)
  end

  def to_contract(%__MODULE__{} = x) do
    %{
      "id" => x.id,
      "event_id" => x.event_id,
      "intent" => x.intent,
      "entities" => x.entities || %{},
      "vibe" => x.vibe || %{},
      "latency_ms" => x.latency_ms
    }
  end
end
