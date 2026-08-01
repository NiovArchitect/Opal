defmodule OpalCore.SocialFlow.DiscoveryOptionSet do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "discovery_option_sets" do
    field :version, :integer, default: 1
    field :candidate_ids, {:array, :binary_id}, default: []
    field :status, :string, default: "active"
    field :selected_candidate_id, :binary_id
    field :no_match, :boolean, default: false
    field :no_match_copy, :string
    field :superseded_at, :utc_datetime_usec
    belongs_to :request, OpalCore.SocialFlow.DiscoveryRequest
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(s, attrs) do
    s
    |> cast(attrs, [
      :request_id,
      :conversation_id,
      :version,
      :candidate_ids,
      :status,
      :selected_candidate_id,
      :no_match,
      :no_match_copy,
      :superseded_at
    ])
    |> validate_required([:request_id, :conversation_id, :version, :status])
    |> validate_inclusion(:status, ~w(active superseded selected dismissed))
  end

  def to_contract(%__MODULE__{} = s) do
    %{
      "id" => s.id,
      "request_id" => s.request_id,
      "conversation_id" => s.conversation_id,
      "version" => s.version,
      "candidate_ids" => s.candidate_ids || [],
      "status" => s.status,
      "selected_candidate_id" => s.selected_candidate_id,
      "no_match" => s.no_match,
      "no_match_copy" => s.no_match_copy
    }
  end
end
