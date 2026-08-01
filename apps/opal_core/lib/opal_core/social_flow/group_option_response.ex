defmodule OpalCore.SocialFlow.GroupOptionResponse do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_option_responses" do
    field :response_state, :string
    field :private_note, :string
    field :shared_note, :string
    field :responded_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :option, OpalCore.SocialFlow.GroupOption
    belongs_to :user, OpalCore.Accounts.User
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :option_id,
      :user_id,
      :response_state,
      :private_note,
      :shared_note,
      :responded_at,
      :idempotency_key
    ])
    |> validate_required([:option_id, :user_id, :response_state, :responded_at, :idempotency_key])
    |> unique_constraint([:option_id, :user_id])
    |> unique_constraint(:idempotency_key)
  end

  def to_public_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "option_id" => r.option_id,
      "user_id" => r.user_id,
      "response_state" => r.response_state,
      "shared_note" => r.shared_note,
      # private_note never in public contract
      "responded_at" => DateTime.to_iso8601(r.responded_at)
    }
  end
end
