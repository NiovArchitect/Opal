defmodule OpalCore.OpalConversations.OpalMessage do
  @moduledoc """
  Phase OC-1 — immutable message in a user's Opal conversation.

  Roles: "user" | "opal". Messages have inserted_at only (no updated_at).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @roles ~w(user opal)
  @max_body 2000

  # OC-1 PLACEHOLDER — replaced by OC-4 response generation.
  @oc1_placeholder_body "I'm listening. Tell me what's on your mind — I can help you plan, remember, or figure things out together."

  schema "opal_messages" do
    field :conversation_id, :binary_id
    field :role, :string
    field :body, :string
    field :metadata, :map

    belongs_to :conversation, OpalCore.OpalConversations.OpalConversation,
      define_field: false,
      foreign_key: :conversation_id

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def roles, do: @roles
  def max_body, do: @max_body
  def oc1_placeholder_body, do: @oc1_placeholder_body

  def changeset(message, attrs) do
    message
    |> cast(attrs, [:conversation_id, :role, :body, :metadata])
    |> validate_required([:conversation_id, :role, :body])
    |> update_change(:body, &trim_body/1)
    |> validate_length(:body, min: 1, max: @max_body)
    |> validate_inclusion(:role, @roles)
  end

  def to_contract(%__MODULE__{} = m) do
    %{
      "id" => m.id,
      "conversation_id" => m.conversation_id,
      "role" => m.role,
      "body" => m.body,
      "metadata" => m.metadata,
      "inserted_at" => datetime(m.inserted_at)
    }
  end

  defp trim_body(nil), do: nil

  defp trim_body(s) when is_binary(s), do: String.trim(s)

  defp trim_body(other), do: other

  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime(_), do: nil
end
