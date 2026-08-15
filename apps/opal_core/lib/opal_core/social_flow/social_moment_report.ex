defmodule OpalCore.SocialFlow.SocialMomentReport do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "social_moment_reports" do
    field :category, :string, default: "inappropriate_content"
    field :note, :string
    field :status, :string, default: "submitted"
    field :idempotency_key, :string
    belongs_to :reporter_user, OpalCore.Accounts.User, foreign_key: :reporter_user_id
    belongs_to :moment, OpalCore.SocialFlow.SocialMomentRecord, foreign_key: :moment_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:reporter_user_id, :moment_id, :category, :note, :status, :idempotency_key])
    |> validate_required([:reporter_user_id, :moment_id, :category, :status, :idempotency_key])
    |> validate_inclusion(
      :category,
      ~w(inappropriate_content harassment spam impersonation safety_concern other)
    )
    |> validate_inclusion(:status, ~w(submitted triaged action_taken no_action closed))
    |> unique_constraint(:idempotency_key)
  end
end
