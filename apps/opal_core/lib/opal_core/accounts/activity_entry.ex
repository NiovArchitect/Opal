defmodule OpalCore.Accounts.ActivityEntry do
  @moduledoc """
  One entry in the account activity trail (adoption wave 2). Written
  at execution time by the actions it records - credential use
  (spec 4.C3), device revoke (4.C2) - with a plain subject and no
  secret material of any kind.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "account_activity_entries" do
    field :user_id, :binary_id
    field :kind, :string
    field :subject, :string
    field :detail, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(entry, attrs) do
    entry
    |> cast(attrs, [:kind, :subject, :detail])
    |> validate_required([:kind])
    |> validate_length(:kind, max: 64)
    |> validate_length(:subject, max: 255)
  end

  def to_contract(%__MODULE__{} = e) do
    %{
      "id" => e.id,
      "kind" => e.kind,
      "subject" => e.subject,
      "detail" => e.detail || %{},
      "at" => e.inserted_at && DateTime.to_iso8601(e.inserted_at)
    }
  end
end
