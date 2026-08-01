defmodule OpalCore.SocialFlow.GroupConstraint do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_constraints" do
    field :constraint_type, :string
    field :visibility, :string, default: "private"
    field :normalized_value, :string
    field :shared_summary, :string
    field :source_message_ids, {:array, :binary_id}, default: []
    field :status, :string, default: "active"
    field :expires_at, :utc_datetime_usec
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :proposal, OpalCore.SocialFlow.GroupPlanProposal
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(c, attrs) do
    c
    |> cast(attrs, [
      :owner_user_id,
      :conversation_id,
      :proposal_id,
      :constraint_type,
      :visibility,
      :normalized_value,
      :shared_summary,
      :source_message_ids,
      :status,
      :expires_at
    ])
    |> validate_required([
      :owner_user_id,
      :conversation_id,
      :constraint_type,
      :visibility,
      :normalized_value,
      :status
    ])
    |> validate_inclusion(:visibility, ~w(private shared_summary shared))
  end

  def to_public_contract(%__MODULE__{} = c, viewer_user_id) do
    if c.owner_user_id == viewer_user_id or c.visibility in ~w(shared shared_summary) do
      value =
        cond do
          c.owner_user_id == viewer_user_id -> c.normalized_value
          c.visibility == "shared" -> c.normalized_value
          true -> c.shared_summary || "One participant has a location requirement."
        end

      %{
        "id" => c.id,
        "constraint_type" => c.constraint_type,
        "visibility" => c.visibility,
        "value" => value,
        "owner_is_viewer" => c.owner_user_id == viewer_user_id
      }
    else
      %{
        "id" => c.id,
        "constraint_type" => c.constraint_type,
        "visibility" => "private",
        "value" => c.shared_summary || "One participant has a location requirement.",
        "owner_is_viewer" => false
      }
    end
  end
end
