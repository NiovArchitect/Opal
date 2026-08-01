defmodule OpalCore.SocialFlow.FeedbackEvent do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "assistance_feedback_events" do
    field :feedback_type, :string
    field :payload, :map, default: %{}

    belongs_to :user, OpalCore.Accounts.User
    belongs_to :attention_signal, OpalCore.SocialFlow.AttentionSignal

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(e, attrs) do
    e
    |> cast(attrs, [:user_id, :attention_signal_id, :feedback_type, :payload])
    |> validate_required([:user_id, :feedback_type])
    |> validate_inclusion(
      :feedback_type,
      ~w(helpful not_helpful too_soon too_often wrong_context dismiss)
    )
  end
end
