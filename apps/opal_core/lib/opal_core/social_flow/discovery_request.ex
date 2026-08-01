defmodule OpalCore.SocialFlow.DiscoveryRequest do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "discovery_requests" do
    field :plan_id, :binary_id
    field :request_type, :string, default: "restaurant"
    field :agreed_time_window, :string
    field :geographic_envelope, :map, default: %{}
    field :participant_count, :integer, default: 2
    field :option_limit, :integer, default: 3
    field :status, :string, default: "pending"
    field :provider_strategy, :string, default: "synthetic"
    field :hard_constraints, :map, default: %{}
    field :soft_preferences, :map, default: %{}
    field :provider_disclosure, :map, default: %{}
    field :hide_sponsored, :boolean, default: false
    field :idempotency_key, :string
    field :completed_at, :utc_datetime_usec
    field :failed_at, :utc_datetime_usec
    field :failure_reason, :string
    belongs_to :intent, OpalCore.SocialFlow.DiscoveryIntent
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :requested_by_user, OpalCore.Accounts.User, foreign_key: :requested_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :intent_id,
      :conversation_id,
      :requested_by_user_id,
      :plan_id,
      :request_type,
      :agreed_time_window,
      :geographic_envelope,
      :participant_count,
      :option_limit,
      :status,
      :provider_strategy,
      :hard_constraints,
      :soft_preferences,
      :provider_disclosure,
      :hide_sponsored,
      :idempotency_key,
      :completed_at,
      :failed_at,
      :failure_reason
    ])
    |> validate_required([
      :intent_id,
      :conversation_id,
      :requested_by_user_id,
      :request_type,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(:request_type, ~w(restaurant activity event venue meeting_place))
    |> validate_inclusion(:status, ~w(pending running completed failed cancelled))
    |> validate_number(:option_limit, greater_than: 0, less_than_or_equal_to: 5)
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "intent_id" => r.intent_id,
      "conversation_id" => r.conversation_id,
      "plan_id" => r.plan_id,
      "request_type" => r.request_type,
      "agreed_time_window" => r.agreed_time_window,
      "geographic_envelope" => r.geographic_envelope,
      "participant_count" => r.participant_count,
      "option_limit" => r.option_limit,
      "status" => r.status,
      "hide_sponsored" => r.hide_sponsored,
      "provider_disclosure" => r.provider_disclosure
    }
  end
end
