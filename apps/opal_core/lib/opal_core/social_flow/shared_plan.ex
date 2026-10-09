defmodule OpalCore.SocialFlow.SharedPlan do
  use Ecto.Schema
  import Ecto.Changeset

  alias OpalCore.SocialFlow.MeetingLinks

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(tentative agreed changed cancelled completed)
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
    field :current_revision_id, :binary_id
    field :cancelled_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :alignment, :map, default: %{}
    field :source, :string, default: "conversation"

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
      :created_from_proposal_id,
      :current_revision_id,
      :created_by_user_id,
      :cancelled_at,
      :completed_at,
      :alignment,
      :source,
      :trip_leg_id
    ])
    |> update_change(:meeting_link, &MeetingLinks.sanitize/1)
    |> validate_required([:title, :status, :created_by_user_id, :timezone])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:source, @sources)
    |> validate_inclusion(:plan_type, @plan_types)
    |> validate_meeting_link()
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
    meeting_link = MeetingLinks.sanitize(Map.get(p, :meeting_link))

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
      "online" => plan_type == "virtual",
      "created_from_proposal_id" => p.created_from_proposal_id,
      "current_revision_id" => p.current_revision_id,
      "created_by_user_id" => p.created_by_user_id,
      "source" => p.source || "conversation",
      "trip_leg_id" => p.trip_leg_id,
      "created_at" => dt(p.inserted_at),
      "cancelled_at" => dt(p.cancelled_at),
      "completed_at" => dt(p.completed_at)
    }

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
    peer_label = if is_binary(peer_tz), do: OpalCore.Relationships.Behavior.local_time_label(moment, peer_tz)

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

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
