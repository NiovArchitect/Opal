defmodule OpalCore.Support.SupportReport do
  @moduledoc """
  One row in the support intake (audit spec 4.A5): a problem report or
  a piece of feedback submitted from Settings. The row carries exactly
  what the page's disclosure lists — the user's words, the kind, the
  category, the served build identity read from the build stamp, and
  the account it came from. Nothing else is accepted or stored.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds ~w(problem feedback)
  @categories ~w(something_broke wrong_information hard_to_use account payments something_else)
  # Spec 4.C7: the same intake is reachable from every surface. The
  # entry point is recorded so parity is provable; it changes
  # nothing about how a report is handled.
  @entry_points ~w(you_help home chats opal graphs plan settings)

  schema "support_reports" do
    field :reference, :string
    field :user_id, :binary_id
    field :kind, :string
    field :category, :string
    field :body, :string
    field :build_ref, :string
    field :entry_point, :string, default: "you_help"
    field :status, :string, default: "received"
    # Repair #18 hardening: the client's idempotency key, scoped to
    # the reporter by the (user_id, idempotency_key) unique index.
    # NULL for keyless submits, which are never deduped.
    field :idempotency_key, :string

    timestamps(type: :utc_datetime_usec)
  end

  def kinds, do: @kinds
  def categories, do: @categories
  def entry_points, do: @entry_points

  def changeset(report, attrs) do
    report
    |> cast(attrs, [
      :reference,
      :user_id,
      :kind,
      :category,
      :body,
      :build_ref,
      :status,
      :entry_point,
      :idempotency_key
    ])
    |> validate_required([:reference, :user_id, :kind, :category, :body])
    |> validate_inclusion(:kind, @kinds)
    |> validate_inclusion(:category, @categories)
    |> validate_inclusion(:entry_point, @entry_points)
    |> validate_length(:body, min: 1, max: 4_000)
    |> validate_length(:build_ref, max: 128)
    |> validate_length(:idempotency_key, max: 128)
    |> unique_constraint(:reference)
    |> unique_constraint([:user_id, :idempotency_key],
      name: :support_reports_user_id_idempotency_key_index
    )
  end

  @doc "The reporter-facing contract: the reference they can quote, and the state."
  def to_reporter_contract(%__MODULE__{} = report) do
    %{
      "reference" => report.reference,
      "kind" => report.kind,
      "category" => report.category,
      "entry_point" => report.entry_point,
      "status" => report.status,
      "submitted_at" => report.inserted_at
    }
  end
end
