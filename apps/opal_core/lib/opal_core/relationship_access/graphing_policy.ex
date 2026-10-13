defmodule OpalCore.RelationshipAccess.GraphingPolicy do
  @moduledoc """
  Standing Graphing modes for calls/chats.

  Global pause overrides relationship grants.
  other_party_disclosure_required flags legal/product need for counterpart notice.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @modes ~w(never ask_each auto_eligible selected_only)

  schema "opal_graphing_policies" do
    field :call_mode, :string, default: "ask_each"
    field :chat_mode, :string, default: "ask_each"
    field :global_paused, :boolean, default: false
    field :paused_at, :utc_datetime_usec
    field :other_party_disclosure_required, :boolean, default: true
    field :audit, :map, default: %{}

    belongs_to :owner, OpalCore.Accounts.User, foreign_key: :owner_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def modes, do: @modes

  def changeset(policy, attrs) do
    policy
    |> cast(attrs, [
      :owner_user_id,
      :call_mode,
      :chat_mode,
      :global_paused,
      :paused_at,
      :other_party_disclosure_required,
      :audit
    ])
    |> validate_required([:owner_user_id, :call_mode, :chat_mode])
    |> validate_inclusion(:call_mode, @modes)
    |> validate_inclusion(:chat_mode, @modes)
    |> unique_constraint(:owner_user_id)
    |> foreign_key_constraint(:owner_user_id)
  end

  def to_contract(%__MODULE__{} = p) do
    %{
      "owner_user_id" => p.owner_user_id,
      "call_mode" => p.call_mode,
      "chat_mode" => p.chat_mode,
      "global_paused" => p.global_paused,
      "paused_at" => p.paused_at,
      "other_party_disclosure_required" => p.other_party_disclosure_required,
      "indicator" => %{
        "label" => "Opal Graphing",
        "when_active_show" => ["pause", "resume", "stop", "manage"]
      },
      "audit" => p.audit || %{}
    }
  end
end
