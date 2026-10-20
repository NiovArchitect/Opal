defmodule OpalCore.SocialFlow.SharedPlan do
  @moduledoc """
  The plan row - and, for place type, the ONE authority.

  Repair #18 Division B (B1, virtual place as first-class): the
  `plan_type` COLUMN on this row is the only authority for whether a
  plan's place is physical ("in_person") or virtual ("virtual").
  `alignment["plan_type"]` is a mirror for fold-based readers, written
  ONLY by `OpalCore.SocialFlow.stamp_place_mirror/2` - never by hand at
  call sites. No reader may re-derive place type from the location
  string ("Online"), from the activity, or from any other field; use
  `virtual?/1` and `place_projection/1`.

  Naming collision, documented not renamed (Division A stability): the
  execution layer's `plan_type` key in attrs maps means the ACTIVITY
  (dinner / concert / park). Place type travels through those layers
  under the explicit key "place_kind" (same "in_person" / "virtual"
  values). This schema's `plan_type` is always the PLACE type.
  """
  use Ecto.Schema
  import Ecto.Changeset

  alias OpalCore.SocialFlow.MeetingLinks

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Repair #18 (Division A): "expired" is the gated terminal status for
  # stale tentative plans (PlanTransition :expire, tentative only).
  @statuses ~w(tentative agreed changed cancelled completed expired)
  @sources ~w(conversation trip_leg center)
  @plan_types ~w(in_person virtual)

  schema "shared_plans" do
    field :title, :string
    field :status, :string
    field :start_at, :utc_datetime_usec
    field :end_at, :utc_datetime_usec
    field :timezone, :string, default: "UTC"
    field :location, :string
    field :time_label, :string
    field :plan_type, :string, default: "in_person"
    field :meeting_link, :string
    # B1 (additive): provider LABEL for a virtual plan's room (zoom /
    # google_meet / teams / facetime / other) and the stamp of the last
    # place-type conversion. Both nullable; nil for never-labelled /
    # never-converted plans.
    field :meeting_provider, :string
    field :place_changed_at, :utc_datetime_usec
    field :current_revision_id, :binary_id
    field :cancelled_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :alignment, :map, default: %{}
    field :source, :string, default: "conversation"
    # R19 W7 (additive): the owner's per-graph private flag, and the
    # place's coordinates when a real place record carries them
    # (nullable - no coordinates, no distance is ever computed).
    field :is_private, :boolean, default: false
    field :place_lat, :float
    field :place_lon, :float

    belongs_to :conversation, OpalCore.Messaging.Conversation

    belongs_to :created_from_proposal, OpalCore.SocialFlow.Proposal,
      foreign_key: :created_from_proposal_id

    belongs_to :created_by_user, OpalCore.Accounts.User, foreign_key: :created_by_user_id
    belongs_to :trip_leg, OpalCore.Trips.TripLeg

    has_many :participants, OpalCore.SocialFlow.PlanParticipant, foreign_key: :plan_id
    has_many :commitments, OpalCore.SocialFlow.PlanCommitment, foreign_key: :plan_id
    has_many :reminders, OpalCore.SocialFlow.PlanReminder, foreign_key: :plan_id
    has_many :revisions, OpalCore.SocialFlow.PlanRevision, foreign_key: :plan_id

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses
  def sources, do: @sources
  def plan_types, do: @plan_types

  def changeset(plan, attrs) do
    plan
    |> cast(attrs, [
      :id,
      :conversation_id,
      :title,
      :status,
      :start_at,
      :end_at,
      :timezone,
      :location,
      :time_label,
      :plan_type,
      :meeting_link,
      :meeting_provider,
      :place_changed_at,
      :created_from_proposal_id,
      :current_revision_id,
      :created_by_user_id,
      :cancelled_at,
      :completed_at,
      :alignment,
      :source,
      :trip_leg_id,
      :is_private,
      :place_lat,
      :place_lon
    ])
    |> update_change(:meeting_link, &MeetingLinks.sanitize/1)
    |> validate_required([:title, :status, :created_by_user_id, :timezone])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:source, @sources)
    |> validate_inclusion(:plan_type, @plan_types)
    |> validate_inclusion(:meeting_provider, MeetingLinks.providers())
    |> validate_meeting_link()
    |> derive_meeting_provider()
    |> maybe_virtual_location()
    |> validate_source_shape()
    |> foreign_key_constraint(:trip_leg_id)
  end

  defp validate_meeting_link(changeset) do
    link = get_change(changeset, :meeting_link) || get_field(changeset, :meeting_link)

    cond do
      is_nil(link) or link == "" ->
        changeset

      MeetingLinks.valid?(link) ->
        changeset

      true ->
        add_error(changeset, :meeting_link, "must be an http(s) URL")
    end
  end

  # B1: the provider label is stored at write time (derived from the
  # sanitized link host) so no surface ever re-parses a URL to pick a
  # label. An explicitly supplied valid label wins; a stale label is
  # re-derived when the link changes underneath it.
  defp derive_meeting_provider(changeset) do
    link = get_field(changeset, :meeting_link)
    explicit = get_change(changeset, :meeting_provider)

    cond do
      is_binary(explicit) ->
        changeset

      not is_nil(get_change(changeset, :meeting_link)) ->
        put_change(changeset, :meeting_provider, MeetingLinks.provider_for(link))

      true ->
        changeset
    end
  end

  @doc "True when the plan's place is a virtual room. The ONLY type test callers may use."
  def virtual?(%__MODULE__{plan_type: "virtual"}), do: true
  def virtual?(%__MODULE__{}), do: false
  def virtual?(_), do: false

  @doc """
  The ONE explicit place projection every surface renders:

      %{"kind" => "physical" | "virtual",
        "label" => location | "Online",
        "meeting_provider" => provider | nil,
        "meeting_link" => sanitized link | nil,   # virtual only
        "join_available" => boolean,               # virtual AND link present
        "directions_available" => boolean}         # physical AND location present

  A physical plan's stored meeting_link (kept on the row after a
  convert-back, for audit/revert) is NEVER projected: while the plan
  is physical the link is dormant and no surface may act on it.
  """
  def place_projection(%__MODULE__{} = p) do
    if virtual?(p) do
      link = MeetingLinks.sanitize(p.meeting_link)

      %{
        "kind" => "virtual",
        "label" => "Online",
        "meeting_provider" =>
          MeetingLinks.normalize_provider(p.meeting_provider) || MeetingLinks.provider_for(link),
        "meeting_link" => link,
        "join_available" => is_binary(link),
        "directions_available" => false
      }
    else
      location = if is_binary(p.location) and String.trim(p.location) != "", do: p.location

      %{
        "kind" => "physical",
        "label" => location,
        "meeting_provider" => nil,
        "meeting_link" => nil,
        "join_available" => false,
        "directions_available" => is_binary(location)
      }
    end
  end

  def place_projection(_), do: nil

  # Virtual plans show Online, never a fake venue address.
  defp maybe_virtual_location(changeset) do
    type = get_field(changeset, :plan_type) || "in_person"

    if type == "virtual" do
      put_change(changeset, :location, "Online")
    else
      changeset
    end
  end

  defp validate_source_shape(changeset) do
    source = get_field(changeset, :source) || "conversation"

    case source do
      "trip_leg" ->
        changeset
        |> validate_required([:trip_leg_id])
        |> validate_nil_conversation()

      "center" ->
        # Solo Center DI accept — no peer conversation required.
        validate_nil_conversation(changeset)

      _ ->
        validate_required(changeset, [:conversation_id])
    end
  end

  defp validate_nil_conversation(changeset) do
    case get_field(changeset, :conversation_id) do
      nil -> changeset
      "" -> put_change(changeset, :conversation_id, nil)
      _ -> add_error(changeset, :conversation_id, "must be nil for trip_leg source")
    end
  end

  def to_contract(%__MODULE__{} = p, opts \\ []) do
    plan_type = Map.get(p, :plan_type) || "in_person"
    place = place_projection(p)
    # B1: the flat meeting_link key follows the projection - virtual
    # plans expose their link; a physical plan's dormant stored link
    # is hidden from every contract (it is audit data, not an action).
    meeting_link = place["meeting_link"]

    base = %{
      "schema_version" => "0.1.0",
      "id" => p.id,
      "conversation_id" => p.conversation_id,
      "title" => p.title,
      "status" => p.status,
      "start_at" => dt(p.start_at),
      "end_at" => dt(p.end_at),
      "timezone" => p.timezone,
      "location" => virtual_location(plan_type, p.location),
      "time_label" => p.time_label,
      "plan_type" => plan_type,
      "meeting_link" => meeting_link,
      "meeting_provider" => place["meeting_provider"],
      "place_changed_at" => dt(Map.get(p, :place_changed_at)),
      # B1: the explicit place projection object - the one output
      # surfaces render for place. Flat keys above stay for old
      # clients; new clients read this object and never re-derive.
      "place" => place,
      "online" => plan_type == "virtual",
      "created_from_proposal_id" => p.created_from_proposal_id,
      "current_revision_id" => p.current_revision_id,
      "created_by_user_id" => p.created_by_user_id,
      "source" => p.source || "conversation",
      "trip_leg_id" => p.trip_leg_id,
      "created_at" => dt(p.inserted_at),
      "cancelled_at" => dt(p.cancelled_at),
      "completed_at" => dt(p.completed_at),
      # Polish C P3 (per-viewer vault): privacy is NOT a plan-global
      # fact anymore. The bare contract carries false; viewer-scoped
      # payload builders (SocialFlow.plan_payload/2) stamp the
      # VIEWER'S OWN mark. The legacy column value is never emitted,
      # so one party's vault state cannot leak into another party's
      # contract through a viewer-less projection.
      "is_private" => false,
      "place_lat" => Map.get(p, :place_lat),
      "place_lon" => Map.get(p, :place_lon)
    }

    # Repair #18 (Division A): the dedupe identity stamped at creation is
    # part of the contract so surfaces can group/merge on intent, not id.
    base =
      case Map.get(p.alignment || %{}, "dedupe") do
        %{"key" => key} when is_binary(key) -> Map.put(base, "dedupe_key", key)
        _ -> base
      end

    # Repair #18 (B2): the completion record is a durable surface input —
    # emit it additively whenever one exists, so every surface renders
    # join/food state from this one projection and never re-derives it.
    # Privacy (§4.2): the contract copy strips each food recipient's
    # household_key (never projected across participants) and their
    # could_not_deliver alternate restaurant name (theirs to share, not
    # the plan's to broadcast). No address field exists to leak.
    base =
      case Map.get(p.alignment || %{}, "completion") do
        %{"steps" => steps} when is_list(steps) ->
          Map.put(base, "completion", %{
            "steps" => Enum.map(steps, &sanitize_completion_step/1),
            "driven_at" => get_in(p.alignment, ["completion", "driven_at"])
          })

        _ ->
          base
      end

    # Repair #16 (W1): graph-create plans carry draft fields in alignment
    # (caption / media / audience / join prefs / repeat provenance / who
    # label). Surface them on the canonical contract so the durable record
    # is what surfaces read back — keys appear ONLY when the plan actually
    # carries them, so every other plan shape is byte-identical to before.
    base =
      Enum.reduce(
        ~w(caption media_id audience who_label repeated_from_plan_id),
        base,
        fn key, acc ->
          case Map.get(p.alignment || %{}, key) do
            v when is_binary(v) and v != "" -> Map.put(acc, key, v)
            _ -> acc
          end
        end
      )
      |> then(fn acc ->
        Enum.reduce(~w(join_requests_on exact_spot_after_join), acc, fn key, a ->
          case Map.get(p.alignment || %{}, key) do
            v when is_boolean(v) -> Map.put(a, key, v)
            _ -> a
          end
        end)
      end)

    # Repair #19 BS-05: a plan carrying media (alignment media_id,
    # the leg above) also projects image_url — the served media
    # path the product itself uses (SocialMomentPublishing media
    # endpoint; byte access is authorized per-viewer for the plan's
    # creator and participants in read_media/2). This is the first
    # field Home's planImageFromRecord reads, so a plan with a real
    # photo finally renders one. Plans without media are unchanged.
    base =
      case Map.get(p.alignment || %{}, "media_id") do
        mid when is_binary(mid) and mid != "" ->
          Map.put(base, "image_url", "/api/v1/product/social-moments/media/" <> mid)

        _ ->
          base
      end

    case Keyword.get(opts, :viewer_timezone) || Keyword.get(opts, :local_times) do
      tz when is_binary(tz) ->
        Map.merge(base, viewer_local_fields(p, tz, opts))

      times when is_map(times) ->
        Map.put(base, "local_times", times)

      _ ->
        case Keyword.get(opts, :member_timezones) do
          tzs when is_map(tzs) and map_size(tzs) > 0 ->
            Map.put(base, "local_times", build_local_times(p, tzs))

          _ ->
            base
        end
    end
  end

  @doc """
  Paste I — plan card for one viewer: THEIR local time label, never UTC-only.
  """
  def viewer_card(%__MODULE__{} = p, viewer_timezone, opts \\ [])
      when is_binary(viewer_timezone) do
    to_contract(p, Keyword.merge(opts, viewer_timezone: viewer_timezone))
  end

  defp viewer_local_fields(%__MODULE__{} = p, viewer_tz, opts) do
    moment = p.start_at || DateTime.utc_now()
    label = OpalCore.Relationships.Behavior.local_time_label(moment, viewer_tz)
    peer_tz = Keyword.get(opts, :peer_timezone)

    peer_label =
      if is_binary(peer_tz), do: OpalCore.Relationships.Behavior.local_time_label(moment, peer_tz)

    local_times =
      %{"viewer" => label}
      |> then(fn m -> if peer_label, do: Map.put(m, "peer", peer_label), else: m end)

    day_name = local_day_name(moment, viewer_tz)

    %{
      "local_times" => local_times,
      "viewer_local_time" => label,
      "viewer_day_name" => day_name,
      "absolute" => dt(moment)
    }
  end

  defp local_day_name(%DateTime{} = moment, tz) when is_binary(tz) do
    local =
      case DateTime.shift_zone(moment, tz) do
        {:ok, l} -> l
        _ -> fixed_local(moment, tz)
      end

    Calendar.strftime(local, "%A")
  end

  defp local_day_name(_, _), do: nil

  # Mirror Behavior fixed offsets when tzdata shift unavailable
  defp fixed_local(%DateTime{} = utc, "America/Los_Angeles") do
    off = if utc.month >= 3 and utc.month <= 10, do: -7, else: -8
    DateTime.add(utc, off * 3600, :second)
  end

  defp fixed_local(%DateTime{} = utc, "Asia/Tokyo"), do: DateTime.add(utc, 9 * 3600, :second)

  defp fixed_local(%DateTime{} = utc, "America/New_York") do
    off = if utc.month >= 3 and utc.month <= 10, do: -4, else: -5
    DateTime.add(utc, off * 3600, :second)
  end

  defp fixed_local(%DateTime{} = utc, _), do: utc

  defp build_local_times(%__MODULE__{} = p, tzs) when is_map(tzs) do
    moment = p.start_at || DateTime.utc_now()

    Map.new(tzs, fn {uid, tz} ->
      {to_string(uid), OpalCore.Relationships.Behavior.local_time_label(moment, tz)}
    end)
  end

  defp virtual_location("virtual", _), do: "Online"
  defp virtual_location(_, loc), do: loc

  # B2 privacy: the shared contract never carries a recipient's
  # household grouping basis or their private alternate restaurant.
  defp sanitize_completion_step(%{"id" => "food", "recipients" => recipients} = step)
       when is_list(recipients) do
    Map.put(
      step,
      "recipients",
      Enum.map(recipients, fn r ->
        r
        |> Map.delete("household_key")
        |> Map.put("alternate_restaurant", nil)
      end)
    )
  end

  defp sanitize_completion_step(step), do: step

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)

  @doc """
  Repair #19 BS-05 — plan media byte authorization, the plan leg of
  SocialMomentPublishing.read_media/2 (the story leg lives in
  TemporaryStoryPublishing by the same pattern). A plan carrying
  `media_id` in its alignment authorizes exactly its own people —
  its creator and its participants — to read those bytes. An
  existence check only: it projects no plan state to anyone.
  """
  def plan_media_authorized?(media_id, viewer_user_id)
      when is_binary(media_id) and is_binary(viewer_user_id) do
    # W20 floor note (pre-existing at the R19 tip, found by the
    # full-suite run): a junk non-UUID viewer id ("" from a
    # signed-out probe) reached the binary_id comparisons below
    # and raised a cast error instead of the clean denial
    # StoryMediaRepair16Test pins. Mirror read_media's own R16
    # guard: an un-castable id authorizes nothing.
    if match?(:error, Ecto.UUID.cast(viewer_user_id)) do
      false
    else
      plan_media_authorized_query(media_id, viewer_user_id)
    end
  end

  defp plan_media_authorized_query(media_id, viewer_user_id) do
    import Ecto.Query

    alias OpalCore.Repo
    alias OpalCore.SocialFlow.PlanParticipant

    from(p in __MODULE__,
      as: :plan,
      where: fragment("? ->> 'media_id' = ?", p.alignment, ^media_id),
      where:
        p.created_by_user_id == ^viewer_user_id or
          exists(
            from(pp in PlanParticipant,
              where: pp.plan_id == parent_as(:plan).id and pp.user_id == ^viewer_user_id
            )
          )
    )
    |> Repo.exists?()
  end

  def plan_media_authorized?(_, _), do: false
end
