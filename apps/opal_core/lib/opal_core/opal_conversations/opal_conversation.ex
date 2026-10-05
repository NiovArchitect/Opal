defmodule OpalCore.OpalConversations.OpalConversation do
  @moduledoc """
  Phase OC-1 — one continuous Opal conversation per user (not threads).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "opal_conversations" do
    field :user_id, :binary_id
    field :title, :string

    has_many :messages, OpalCore.OpalConversations.OpalMessage, foreign_key: :conversation_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(conversation, attrs) do
    conversation
    |> cast(attrs, [:user_id, :title])
    |> validate_required([:user_id])
    |> unique_constraint(:user_id)
    |> update_change(:title, &trim_or_nil/1)
    |> validate_length(:title, max: 120)
  end

  def title_changeset(conversation, title) when is_binary(title) do
    conversation
    |> change(%{title: trim_title(title)})
  end

  def to_contract(%__MODULE__{} = c, messages \\ []) do
    %{
      "id" => c.id,
      "user_id" => c.user_id,
      "title" => c.title,
      "inserted_at" => datetime(c.inserted_at),
      "updated_at" => datetime(c.updated_at),
      "messages" => Enum.map(messages, &OpalCore.OpalConversations.OpalMessage.to_contract/1)
    }
  end

  defp trim_title(s) do
    s
    |> String.trim()
    |> case do
      "" -> nil
      t -> String.slice(t, 0, 120)
    end
  end

  defp trim_or_nil(nil), do: nil

  defp trim_or_nil(s) when is_binary(s) do
    case String.trim(s) do
      "" -> nil
      t -> t
    end
  end

  defp trim_or_nil(other), do: other

  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime(_), do: nil
end
