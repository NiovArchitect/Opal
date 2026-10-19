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
    # Repair #19 (W14 + Orbits) — birth scope + the ONE primary anchor.
    field :context_person_id, :binary_id
    field :context_plan_id, :binary_id
    field :context_conversation_id, :binary_id
    field :anchor_type, :string
    field :anchor_id, :string
    field :anchor_label, :string
    field :orbit_private, :boolean, default: false
    field :pinned_at, :utc_datetime_usec
    field :user_archived_at, :utc_datetime_usec

    has_many :messages, OpalCore.OpalConversations.OpalMessage, foreign_key: :conversation_id

    timestamps(type: :utc_datetime_usec)
  end

  @anchor_types ~w(person plan place)

  @doc "The legal primary-anchor types (Orbits: person, plan, or place)."
  def anchor_types, do: @anchor_types

  def changeset(conversation, attrs) do
    conversation
    |> cast(attrs, [:user_id, :title, :planning_context, :archived_at])
    |> validate_required([:user_id])
    |> unique_constraint(:user_id, name: :opal_conversations_active_user_uidx)
    |> update_change(:title, &trim_or_nil/1)
    |> validate_length(:title, max: @max_title)
  end

  @doc """
  Programmatic scope/anchor write (Repair #19): scope ids and the
  primary anchor are set by the service layer after fail-closed
  validation, never cast from client attrs.
  """
  def scope_changeset(conversation, fields) when is_map(fields) do
    conversation
    |> change(
      Map.take(fields, [
        :context_person_id,
        :context_plan_id,
        :context_conversation_id,
        :anchor_type,
        :anchor_id,
        :anchor_label,
        :orbit_private
      ])
    )
    |> validate_inclusion(:anchor_type, [nil | @anchor_types])
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
      # Repair #19 — raw scope + anchor (ids). Display names are filled
      # live by OpalConversations (person_name / plan_title); the
      # anchor label snapshot serves place anchors, which have no
      # owner-side record to derive a name from.
      "context" => context_map(c),
      "anchor" => anchor_map(c),
      # Conversation chrome: one pin + one user-archive truth.
      "pinned" => not is_nil(c.pinned_at),
      "pinned_at" => datetime(c.pinned_at),
      "user_archived" => not is_nil(c.user_archived_at),
      "user_archived_at" => datetime(c.user_archived_at),
      "messages" => Enum.map(messages, &OpalCore.OpalConversations.OpalMessage.to_contract/1)
    }
  end

  defp context_map(%__MODULE__{context_person_id: nil}), do: nil

  defp context_map(%__MODULE__{} = c) do
    %{
      "person_id" => c.context_person_id,
      "person_name" => nil,
      "plan_id" => c.context_plan_id,
      "plan_title" => nil,
      "conversation_id" => c.context_conversation_id
    }
  end

  defp anchor_map(%__MODULE__{anchor_type: nil}), do: nil

  defp anchor_map(%__MODULE__{} = c) do
    %{
      "type" => c.anchor_type,
      "id" => c.anchor_id,
      "label" => c.anchor_label,
      "private" => c.orbit_private == true
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
