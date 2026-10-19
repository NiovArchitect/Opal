defmodule OpalCore.SocialFlow.RevealDismissal do
  @moduledoc """
  Repair #18 DIR-4 - the truth side's dismissal record for a proactive
  reveal. One row per (viewer, reveal_key); its existence means the
  reveal never renders again for that viewer, in any channel
  (QUIET law: dismissal is permanent and respected everywhere).
  The derivation (OpalCore.SocialFlow.Reveal) is the only reader.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "proactive_reveal_dismissals" do
    field :reveal_key, :string
    belongs_to :viewer_user, OpalCore.Accounts.User, foreign_key: :viewer_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:viewer_user_id, :reveal_key])
    |> validate_required([:viewer_user_id, :reveal_key])
    |> validate_length(:reveal_key, max: 300)
    |> unique_constraint([:viewer_user_id, :reveal_key],
      name: :proactive_reveal_dismissals_viewer_key_uniq
    )
  end
end
