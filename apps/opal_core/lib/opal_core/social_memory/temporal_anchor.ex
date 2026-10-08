defmodule OpalCore.SocialMemory.TemporalAnchor do
  @moduledoc """
  Account-scoped temporal anchor (birthday, anniversary, deadline, recurring, one-time).

  Ground truth (Paste A Phase 0):
  - Extraction `entities.times` today is a list of free-text strings from
    `OpalCore.Intelligence.LlmExtract.normalize_entities/1` (`"times" => [...]`).
    Granularity is noisy (months without days common); reliable when LLM/rules
    extract explicit phrases; vague ("sometime in June") is noisy.
  - `person_memories.known_facts` stores maps like
    `%{"birthday" => %{"value" => "my birthday is June 14th", ...}}` via
    `SocialMemory.Ingest.fact_key/1` — date-like strings, not ISO dates.
  - Date math uses Elixir stdlib `Date`/`DateTime` (no Timex/Calendar hex dep).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @types ~w(birthday anniversary deadline recurring_event one_time)

  schema "temporal_anchors" do
    field :account_id, :binary_id
    field :person_id, :binary_id
    field :anchor_type, :string
    field :date, :date
    field :recurrence, :map
    field :source_text, :string
    field :source_message_id, :binary_id
    field :confidence, :float, default: 0.0
    field :needs_confirmation, :boolean, default: false
    field :confirmed, :boolean, default: false
    field :last_occurrence, :date

    timestamps(type: :utc_datetime_usec)
  end

  def anchor_types, do: @types

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :account_id,
      :person_id,
      :anchor_type,
      :date,
      :recurrence,
      :source_text,
      :source_message_id,
      :confidence,
      :needs_confirmation,
      :confirmed,
      :last_occurrence
    ])
    |> validate_required([:account_id, :anchor_type, :date, :confidence])
    |> validate_inclusion(:anchor_type, @types)
    |> validate_number(:confidence, greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0)
  end
end
