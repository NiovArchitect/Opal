defmodule OpalCore.SocialMemory.WeeklyBriefing do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "weekly_briefings" do
    field :account_id, :binary_id
    field :week_start, :date
    field :content, :string
    field :generated_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:account_id, :week_start, :content, :generated_at])
    |> validate_required([:account_id, :week_start, :content, :generated_at])
  end
end
