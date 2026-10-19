defmodule OpalCore.Accounts.DeletionReceipt do
  @moduledoc """
  The completion receipt for a deletion (spec 4.C6): a quotable
  reference, the mode that ran, its source (self-serve or the
  support path - both execute the same semantics), and a plain
  summary of what was removed and what shared truth stood.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "deletion_receipts" do
    field :reference, :string
    field :user_id, :binary_id
    field :mode, :string
    field :source, :string, default: "self_serve"
    field :summary, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(receipt, attrs) do
    receipt
    |> cast(attrs, [:mode, :source, :summary])
    |> validate_required([:mode])
    |> validate_inclusion(:mode, ~w(data account))
    |> validate_inclusion(:source, ~w(self_serve support))
    # Repair #18 hardening: the reference unique index becomes a
    # named changeset constraint so a collision is a retryable
    # {:error, changeset} for AccountDeletion, never a raise inside
    # the deletion transaction.
    |> unique_constraint(:reference, name: :deletion_receipts_reference_index)
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "reference" => r.reference,
      "mode" => r.mode,
      "source" => r.source,
      "summary" => r.summary || %{},
      "completed_at" => r.inserted_at && DateTime.to_iso8601(r.inserted_at)
    }
  end
end
