defmodule OpalCore.MemoryWallet.MemoryCapsule do
  @moduledoc """
  W-GAP-02 first form - the stored personal-memory capsule row.

  A capsule is ONE object (WALLET_MAP section A): a `payload`, a
  `provenance` record, and a `scope_policy` - the policy dimensions
  stored AS DATA on the object, never as code branches elsewhere.
  The denormalized columns (`scope_kind`, `scope_id`, `purpose`,
  `expires_at`) mirror the policy so the mediated read facade can
  filter in the query; `PersonalMemoryCapsule.scope_policy/1` is the
  one place that builds the policy map, and it keeps the columns
  and the map in step.

  Scope kinds the capsule class recognizes - anything else on a row
  is unrecognized and the read facade FAILS CLOSED for it (GYRO-06
  closing condition for this class: no allow-all fall-through).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @recognized_scope_kinds ~w(user personal relationship conversation group plan activity_type zone time_horizon)

  def recognized_scope_kinds, do: @recognized_scope_kinds

  def recognized_scope_kind?(kind) when is_binary(kind), do: kind in @recognized_scope_kinds
  def recognized_scope_kind?(_), do: false

  schema "memory_capsules" do
    field :wallet_id, :binary_id
    field :owner_user_id, :binary_id
    field :payload, :map, default: %{}
    field :provenance, :map, default: %{}
    field :scope_policy, :map, default: %{}
    field :scope_kind, :string, default: "user"
    field :scope_id, :string
    field :purpose, :string
    field :expires_at, :utc_datetime_usec
    field :review_at, :utc_datetime_usec
    field :version, :integer, default: 1
    field :supersedes_id, :binary_id
    field :status, :string, default: "active"

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(capsule, attrs) do
    capsule
    |> cast(attrs, [
      :wallet_id,
      :owner_user_id,
      :payload,
      :provenance,
      :scope_policy,
      :scope_kind,
      :scope_id,
      :purpose,
      :expires_at,
      :review_at,
      :version,
      :supersedes_id,
      :status
    ])
    |> validate_required([:wallet_id, :owner_user_id, :payload, :scope_kind, :status])
    |> validate_inclusion(:status, ~w(active forgotten))
  end
end
