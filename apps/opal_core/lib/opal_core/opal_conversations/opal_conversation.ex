defmodule OpalCore.OpalConversations.OpalConversation do
  @moduledoc """
  Phase OC-1 — one continuous Opal conversation per user (not threads).

  Repair #17 (W4-7) — Opal chat SESSIONS: a user may hold many Opal
  conversations over time. Exactly one is active (`archived_at` is nil);
  starting a new chat archives the current session (retained, listable,
  switchable) and opens a fresh one. The partial unique index
  `opal_conversations_active_user_uidx` enforces the one-active law.
  """

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @max_title 120

  @doc "The one title length limit for an Opal conversation."
  def max_title, do: @max_title

  schema "opal_conversations" do
    field :user_id, :binary_id
    field :title, :string
    field :planning_context, :map
    field :archived_at, :utc_datetime_usec

    has_many :messages, OpalCore.OpalConversations.OpalMessage, foreign_key: :conversation_id

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(conversation, attrs) do
    conversation
    |> cast(attrs, [:user_id, :title, :planning_context, :archived_at])
    |> validate_required([:user_id])
    |> unique_constraint(:user_id, name: :opal_conversations_active_user_uidx)
    |> update_change(:title, &trim_or_nil/1)
    |> validate_length(:title, max: @max_title)
  end

  @doc "Query for the user's single active (non-archived) Opal session."
  def active_query(user_id) when is_binary(user_id) do
    from(c in __MODULE__,
      where: c.user_id == ^user_id and is_nil(c.archived_at),
      order_by: [desc: c.updated_at, desc: c.inserted_at],
      limit: 1
    )
  end

  @doc "Query for all of the user's Opal sessions, active first, newest first."
  def sessions_query(user_id) when is_binary(user_id) do
    from(c in __MODULE__,
      where: c.user_id == ^user_id,
      order_by: [asc_nulls_first: c.archived_at, desc: c.updated_at, desc: c.inserted_at]
    )
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
      "archived" => not is_nil(c.archived_at),
      "archived_at" => datetime(c.archived_at),
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
      t -> String.slice(t, 0, @max_title)
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
