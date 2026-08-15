defmodule OpalCore.SocialFlow.SocialMomentRecord do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @visibilities ~w(private specific_people group friends)
  @moderation ~w(pending active restricted removed)

  schema "social_moments" do
    field :caption, :string, default: ""
    field :social_context, :string
    field :visibility, :string, default: "friends"
    field :audience_user_ids, {:array, :binary_id}, default: []
    field :group_conversation_id, :binary_id
    field :place_ref, :map, default: %{}
    field :media_ids, {:array, :binary_id}, default: []
    field :source_lineage_id, :binary_id
    field :shared_reality_id, :binary_id
    field :moderation_state, :string, default: "active"
    field :deleted_at, :utc_datetime_usec
    field :edited_at, :utc_datetime_usec
    field :commerce_led, :boolean, default: false
    field :attribution_eligible, :boolean, default: false
    belongs_to :author_user, OpalCore.Accounts.User, foreign_key: :author_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def visibilities, do: @visibilities
  def moderation_states, do: @moderation

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :author_user_id,
      :caption,
      :social_context,
      :visibility,
      :audience_user_ids,
      :group_conversation_id,
      :place_ref,
      :media_ids,
      :source_lineage_id,
      :shared_reality_id,
      :moderation_state,
      :deleted_at,
      :edited_at,
      :commerce_led,
      :attribution_eligible
    ])
    |> validate_required([:author_user_id, :visibility, :moderation_state])
    |> validate_inclusion(:visibility, @visibilities)
    |> validate_inclusion(:moderation_state, @moderation)
    |> validate_change(:commerce_led, fn :commerce_led, v ->
      if v == true, do: [commerce_led: "Social Moments cannot be commerce-led"], else: []
    end)
  end

  def public_contract(%__MODULE__{} = m, opts \\ []) do
    include_media = Keyword.get(opts, :include_media_urls, false)

    %{
      "id" => m.id,
      "author_user_id" => m.author_user_id,
      "caption" => m.caption,
      "social_context" => m.social_context,
      "visibility" => m.visibility,
      "place_ref" => m.place_ref || %{},
      "media_ids" => m.media_ids || [],
      "media_urls" => if(include_media, do: Keyword.get(opts, :media_urls, []), else: []),
      "moderation_state" => m.moderation_state,
      "deleted" => not is_nil(m.deleted_at),
      "commerce_led" => false,
      "book_now_cta" => false,
      "earn_money_cta" => false,
      "attribution_eligible" => m.attribution_eligible == true,
      "is_payout" => false,
      "live_economic" => false,
      "created_at" => m.inserted_at,
      "human_surface" => %{
        "cta" => "Do this with your people",
        "suppress_commerce" => true
      }
    }
  end
end
