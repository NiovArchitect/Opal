defmodule OpalCore.Intelligence.Decision do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @actions ~w(
    respond.thread
    plan.create plan.update plan.cancel plan.confirm
    suggest.alternative
    notify.push
    silent
    escalate.user
  )

  schema "intelligence_decisions" do
    field :action, :string
    field :reason, :string
    field :confidence, :float
    field :payload, :map, default: %{}
    field :context_snapshot, :map, default: %{}

    belongs_to :event, OpalCore.Intelligence.Event
    belongs_to :extraction, OpalCore.Intelligence.Extraction

    timestamps(type: :utc_datetime_usec)
  end

  def actions, do: @actions

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :event_id,
      :extraction_id,
      :action,
      :reason,
      :confidence,
      :payload,
      :context_snapshot
    ])
    |> validate_required([:event_id, :action, :reason, :confidence])
    |> validate_inclusion(:action, @actions)
    |> validate_number(:confidence, greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0)
  end

  def to_contract(%__MODULE__{} = d) do
    %{
      "id" => d.id,
      "event_id" => d.event_id,
      "extraction_id" => d.extraction_id,
      "action" => d.action,
      "reason" => d.reason,
      "confidence" => d.confidence,
      "payload" => d.payload || %{}
    }
  end
end
