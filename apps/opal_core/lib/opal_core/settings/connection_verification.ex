defmodule OpalCore.Settings.ConnectionVerification do
  @moduledoc """
  Repair #18 DIR-2 — one recorded verification event for a connection
  (verification report Part 4.4). Written ONLY by the server-side probe
  runner or by function-evidence hooks at the points where the product
  already records truth — never by a settings page view, a test fixture
  in the product path, or a seed.

  `kind` is "probe" | "function_evidence"; `outcome` is "pass" | "fail" |
  "refused". `provider_error_code` carries a provider error CODE only
  (e.g. "PERMISSION_DENIED") — never a response body, never an
  identifier, never any part of a credential.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds ~w(probe function_evidence)
  @outcomes ~w(pass fail refused)

  schema "connection_verifications" do
    field :connection_id, :string
    field :kind, :string
    field :outcome, :string
    field :provider_error_code, :string
    field :build_ref, :string
    field :recorded_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def kinds, do: @kinds
  def outcomes, do: @outcomes

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :connection_id,
      :kind,
      :outcome,
      :provider_error_code,
      :build_ref,
      :recorded_at
    ])
    |> validate_required([:connection_id, :kind, :outcome, :recorded_at])
    |> validate_inclusion(:kind, @kinds)
    |> validate_inclusion(:outcome, @outcomes)
  end
end
