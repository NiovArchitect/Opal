defmodule OpalCore.Lives.VenueContribution do
  @moduledoc "Per-venue vibe contributor facts (not a score)."

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "venue_contributions" do
    field :venue_id, :binary_id
    field :account_id, :binary_id
    field :live_attend_count, :integer, default: 0
    field :sticker_count, :integer, default: 0
    field :opt_in_public, :boolean, default: false
    field :display_name, :string
    field :last_attended_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :venue_id,
      :account_id,
      :live_attend_count,
      :sticker_count,
      :opt_in_public,
      :display_name,
      :last_attended_at
    ])
    |> validate_required([:venue_id, :account_id])
    |> unique_constraint([:venue_id, :account_id], name: :venue_contributions_venue_account_index)
  end

  def to_stranger_contract(%__MODULE__{} = c) do
    %{"live_attend_count" => c.live_attend_count, "sticker_count" => c.sticker_count}
  end

  def to_circle_contract(%__MODULE__{} = c) do
    to_stranger_contract(c)
    |> Map.put("display_name", if(c.opt_in_public, do: c.display_name, else: nil))
    |> Map.put("account_id", if(c.opt_in_public, do: c.account_id, else: nil))
  end
end
