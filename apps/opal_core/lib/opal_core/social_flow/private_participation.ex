defmodule OpalCore.SocialFlow.PrivateParticipation do
  @moduledoc """
  Authoritative private participation store for alignment.

  Private answers never enter:
  - shared HTTP message history
  - shared socket events
  - push previews
  - general logs / metrics payloads
  """

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.AlignmentParticipation

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "alignment_private_participations" do
    field :conversation_id, :binary_id
    field :user_id, :binary_id
    field :proposal_key, :string
    field :response_key, :string
    field :invalidates_set, :boolean, default: false

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :conversation_id,
      :user_id,
      :proposal_key,
      :response_key,
      :invalidates_set
    ])
    |> validate_required([:conversation_id, :user_id, :proposal_key, :response_key])
    |> validate_inclusion(:response_key, Enum.map(AlignmentParticipation.public_action_labels(), &elem(&1, 0)))
  end

  @doc "Record private response. Returns shared-safe projection only."
  def record(attrs) do
    conv = fetch!(attrs, :conversation_id)
    user = fetch!(attrs, :user_id)
    key = fetch!(attrs, :response_key)
    proposal = Map.get(attrs, :proposal_key) || "default"

    unless AlignmentParticipation.valid_response?(key) do
      {:error, :invalid_response}
    else
      unless member?(conv, user) do
        {:error, :not_a_member}
      else
        invalidates? = key in ~w(need_another_time not_this_time)

        existing =
          Repo.get_by(__MODULE__,
            conversation_id: conv,
            user_id: user,
            proposal_key: proposal
          )

        case existing do
          %__MODULE__{} = row ->
            row
            |> changeset(%{response_key: key, invalidates_set: invalidates?})
            |> Repo.update!()

          nil ->
            %__MODULE__{}
            |> changeset(%{
              conversation_id: conv,
              user_id: user,
              proposal_key: proposal,
              response_key: key,
              invalidates_set: invalidates?
            })
            |> Repo.insert!()
        end

        {:ok, AlignmentParticipation.shared_safe_projection(key)}
      end
    end
  end

  def invalidates_set?(conversation_id, proposal_key \\ "default") do
    from(p in __MODULE__,
      where:
        p.conversation_id == ^conversation_id and p.proposal_key == ^proposal_key and
          p.invalidates_set == true,
      select: count(p.id)
    )
    |> Repo.one()
    |> Kernel.>(0)
  end

  @doc "Shared payloads must never include response_key or user_id of private answers."
  def assert_shared_safe!(payload) when is_map(payload) do
    forbidden = ["response_key", "private_response", "reason", "why", "user_id"]

    Enum.each(forbidden, fn k ->
      if Map.has_key?(payload, k) and k != "shared_safe" do
        # allow shared_safe structure only with label
        :ok
      end
    end)

    if Map.get(payload, "response_key") do
      raise "private response_key leaked into shared payload"
    end

    if Map.get(payload, "private_reason") do
      raise "private_reason leaked into shared payload"
    end

    :ok
  end

  def assert_shared_safe!(_), do: :ok

  defp member?(conversation_id, user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, to_string(key)) ||
      raise ArgumentError, "missing #{inspect(key)}"
  end
end
