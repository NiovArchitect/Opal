defmodule OpalCore.SocialFlow.AttentionCenterItem do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @sections ~w(needs_you waiting updated)
  @statuses ~w(active resolved superseded expired)

  schema "attention_center_items" do
    field :owner_user_id, :string
    field :dedupe_key, :string
    field :section, :string
    field :level, :string, default: "ambient"
    field :reason, :string
    field :title, :string
    field :detail, :string
    field :copy, :string
    field :action_required, :boolean, default: false
    field :badge_eligible, :boolean, default: false
    field :seen, :boolean, default: false
    field :status, :string, default: "active"
    field :conversation_id, :string
    field :plan_id, :string
    field :deep_link_kind, :string
    field :deep_link_id, :string
    field :muted, :boolean, default: false
    field :source_type, :string
    field :privacy_safe, :boolean, default: true
    field :metadata, :map, default: %{}
    field :resolved_at, :utc_datetime_usec
    field :superseded_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def sections, do: @sections
  def statuses, do: @statuses

  def changeset(item, attrs) do
    item
    |> cast(attrs, [
      :owner_user_id,
      :dedupe_key,
      :section,
      :level,
      :reason,
      :title,
      :detail,
      :copy,
      :action_required,
      :badge_eligible,
      :seen,
      :status,
      :conversation_id,
      :plan_id,
      :deep_link_kind,
      :deep_link_id,
      :muted,
      :source_type,
      :privacy_safe,
      :metadata,
      :resolved_at,
      :superseded_at
    ])
    |> validate_required([:owner_user_id, :dedupe_key, :section, :title, :status])
    |> validate_inclusion(:section, @sections)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:owner_user_id, :dedupe_key])
  end

  def to_contract(%__MODULE__{} = i) do
    meta = i.metadata || %{}

    enriched =
      try do
        OpalCore.Intelligence.ProductSurface.enrich_attention_metadata(meta, i)
      rescue
        _ -> meta
      end

    %{
      "id" => i.id,
      "dedupe_key" => i.dedupe_key,
      "section" => i.section,
      "level" => i.level,
      "reason" => i.reason,
      "title" => i.title,
      "detail" => i.detail || i.copy,
      "copy" => i.copy || i.detail,
      "action_required" => i.action_required == true,
      "badge_eligible" => i.badge_eligible == true,
      "seen" => i.seen == true,
      "status" => i.status,
      "conversation_id" => i.conversation_id,
      "plan_id" => i.plan_id || enriched["plan_id"] || meta["plan_id"],
      "deep_link" => %{
        "kind" => i.deep_link_kind,
        "id" => i.deep_link_id || i.conversation_id || i.plan_id,
        "conversation_id" => i.conversation_id || meta["conversation_id"],
        "plan_id" => i.plan_id || enriched["plan_id"] || meta["plan_id"],
        "proposal_id" => meta["proposal_id"],
        "source_id" => meta["source_id"],
        "focus" => meta["focus"],
        "target_surface" => meta["target_surface"],
        "reason" => i.reason
      },
      "source_type" => i.source_type,
      "source_id" => meta["source_id"],
      "privacy_safe" => i.privacy_safe != false,
      "muted" => i.muted == true,
      # Paste F — reminder lifecycle enrichment (real fields; FE no longer guesses)
      "lifecycle" => enriched["lifecycle"],
      "person_id" => enriched["person_id"],
      "person_name" => enriched["person_name"],
      "anchor_type" => enriched["anchor_type"],
      "anchor_date" => enriched["anchor_date"],
      "days_until" => enriched["days_until"],
      "plan_status" => enriched["plan_status"],
      "plan_summary" => enriched["plan_summary"]
    }
  end
end
