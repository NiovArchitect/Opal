defmodule OpalCore.OpalContext do
  @moduledoc """
  Phase OC-2 — Opal Center context assembly.

  Gathers everything Opal needs to understand the user into one packet.
  No generation (OC-4). No intent (OC-3). Empty lists when data is absent.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.CelebrationCuration
  alias OpalCore.Celebrations
  alias OpalCore.FinancialProfiles
  alias OpalCore.GroupTastes
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Messaging.Message
  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalConversation
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialFlow.MeetingLinks
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Taste
  alias OpalCore.TrustTiers

  @default_timezone "America/Los_Angeles"
  @max_message 2000
  @history_limit 10
  @fit_activity_cap 6
  @fit_activities ~w(walk run yoga strength outdoors rest)
  @fit_goals ~w(move_more recover stay_active)
  @context_keys ~w(user taste temporal social message relationships trust_tier financial fit group_tastes conversation_history preferences location orbit_scope)a

  @doc """
  Assemble a context packet for `user_id` + inbound `message_text`.

  Optional `client_context` may carry a share-gated `:fit` / `"fit"` slice from
  the requesting user's device. Fit is never inferred (Pass 2 locked) and is
  never a disclosure grant to other people — use-permission only.

  Returns `{:ok, context_map}` with keys including RU-2 `:trust_tier`,
  RU-3 `:financial`, gated `:fit`, D-1 `:group_tastes`, and short-term
  `:conversation_history` (last 10 Opal Center messages, role+body only).
  """
  def assemble(user_id, message_text, client_context \\ nil, opts \\ [])

  def assemble(user_id, message_text, client_context, opts)
      when is_binary(user_id) and is_binary(message_text) do
    # Repair #22 (WS-10) — the SCOPED session the turn was posted to,
    # when the caller knows it. Before this, assembly received only
    # the user: the packet carried no anchor, no person/plan scope,
    # and none of the anchored human thread's messages, and the
    # history was re-derived from whichever session happened to be
    # "active" — so generation inside an anchored orbit ran on a
    # global brain (global frequent contacts + unscoped history) and
    # could speak about the orbit's own person in the third person
    # as if they were elsewhere ("You mentioned Maya earlier" inside
    # Maya's own orbit). The session's scope is now assembled INTO
    # the packet as :orbit_scope and the history is read from THIS
    # session, never re-derived.
    session =
      case Keyword.get(opts, :session) do
        %OpalConversation{} = s -> s
        _ -> nil
      end
    case Repo.get(User, user_id) do
      nil ->
        {:error, :user_not_found}

      %User{} = user ->
        text = message_text |> String.trim() |> String.slice(0, @max_message)
        tier = TrustTiers.get_tier(user_id)

        prefs = assemble_preferences(user_id)

        context = %{
          user: assemble_user(user, prefs),
          taste: gated_taste(user_id, tier),
          temporal: gated_temporal(user_id, tier),
          social: gated_social(user_id, tier),
          message: assemble_message(text),
          # RU-1 — gated at trusted+
          relationships: gated_relationships(user_id, tier),
          # RU-2
          trust_tier: tier,
          # RU-3 — trusted+ and profile present only; no notes
          financial: gated_financial(user_id, tier),
          # Explicit Fit prefs from requesting user only (share-gated FE)
          fit: gated_fit(client_context),
          # D-1 — top groups (plan_count >= 3), aggregate only
          group_tastes: GroupTastes.context_slices_for(user_id),
          # Short-term memory — prior Opal Center turns (not the inbound text).
          # WS-10: when the turn belongs to a known session, the history is
          # THAT session's — the scoped room's own turns — not the active
          # session's by coincidence.
          conversation_history: assemble_conversation_history(user_id, session),
          # Repair #22 (WS-10) — the orbit scope slice: the anchor, the
          # scoped person/plan, and the anchored human thread's actual
          # recent messages. Nil for unscoped Center turns (unchanged).
          orbit_scope: assemble_orbit_scope(user_id, session),
          preferences: prefs,
          # Repair #18 (A-center) - location the product actually holds,
          # read fresh on every Center turn: the travel state's current
          # city and whether a fresh coarse device fix is on file.
          # Repair #18 residuals (R-3b): a granted fix also contributes
          # its coarse resolved city (DeviceLocation.city_for_coords) -
          # a fix the product cannot name a city for could never answer
          # the city question it was granted for.
          location: assemble_location(user_id)
        }

        {:ok, context}
    end
  end

  def assemble(_, _, _, _), do: {:error, :invalid}

  def context_keys, do: @context_keys

  # Repair #18 (A-center) - the Center location slice.
  #
  # Contract for the web worker: the client sends coarse device coords via
  # the existing location ingest (POST /api/v1/product/opal/location,
  # stored by Center.DeviceLocation as PlanningContext extra
  # "device_coords" = %{"lat", "lon", "origin_source", "updated_at"}), and
  # may send a city via the travel ingest (POST /api/v1/product/travel/ingest
  # with "city" + "timezone", stored on travel_states.current_city). This
  # slice - and Oracle's :current_location kind - READ those stored rows;
  # the message payload itself carries no location fields.
  defp assemble_location(user_id) do
    alias OpalCore.Center.DeviceLocation
    alias OpalCore.Intelligence.{TravelMode, TravelState}

    {city, travel_active?} =
      case TravelMode.active_state(user_id) do
        %TravelState{current_city: city} when is_binary(city) and city != "" ->
          {city, true}

        %TravelState{} ->
          {nil, true}

        _ ->
          {nil, false}
      end

    device =
      case DeviceLocation.get_for_user(user_id) do
        {:ok, coords} ->
          %{
            present: true,
            origin_source: coords["origin_source"],
            updated_at: coords["updated_at"],
            # Repair #18 residuals (R-3b): the coarse city the granted
            # fix resolves to, so the assembled slice can actually
            # answer "what city am I in?" from the grant itself.
            city: DeviceLocation.city_for_coords(coords)
          }

        :none ->
          %{present: false, origin_source: nil, updated_at: nil, city: nil}
      end

    # A granted device fix is a location the product holds: when no
    # travel city is on file, the fix's city IS the current city.
    city = city || device.city

    %{current_city: city, travel_active: travel_active?, device: device}
  end

  defp assemble_user(%User{} = user, prefs) do
    %{
      id: user.id,
      display_name: user.display_name,
      handle: user.handle,
      timezone: prefs[:timezone] || @default_timezone
    }
  end

  defp assemble_preferences(user_id) do
    case Repo.get_by(AssistancePreference, user_id: user_id) do
      %AssistancePreference{} = p ->
        %{
          timezone: present_tz(p.timezone),
          usual_meeting_link: MeetingLinks.sanitize(p.usual_meeting_link)
        }

      _ ->
        %{timezone: @default_timezone, usual_meeting_link: nil}
    end
  end

  defp present_tz(tz) when is_binary(tz) and tz != "" and tz != "UTC", do: tz
  defp present_tz(_), do: @default_timezone

  defp empty_taste, do: %{vibes: [], cuisines: [], price_comfort: nil}

  defp gated_taste(user_id, tier) do
    if TrustTiers.can_access_tier?(tier, :taste) do
      taste = assemble_taste(user_id)

      # Financial comfort requires trusted+
      if TrustTiers.can_access_tier?(tier, :financial) do
        taste
      else
        %{taste | price_comfort: nil}
      end
    else
      empty_taste()
    end
  end

  defp assemble_taste(user_id) do
    case Taste.profile_for(user_id) do
      %{vibes: vibes, cuisines: cuisines, price_comfort: price} ->
        %{
          vibes: List.wrap(vibes) |> Enum.take(5),
          cuisines: List.wrap(cuisines) |> Enum.take(5),
          price_comfort: price
        }

      nil ->
        empty_taste()

      _ ->
        empty_taste()
    end
  end

  defp gated_temporal(user_id, tier) do
    %{
      recent_plans:
        if(TrustTiers.can_access_tier?(tier, :plans), do: recent_plans(user_id), else: []),
      upcoming_celebrations:
        if(TrustTiers.can_access_tier?(tier, :celebrations),
          do: upcoming_celebrations(user_id),
          else: []
        ),
      # Conversation count is basic activity — always available.
      active_conversation_count: active_conversation_count(user_id)
    }
  end

  defp gated_social(user_id, tier) do
    # Frequent contacts / group patterns support planning — known+.
    if TrustTiers.can_access_tier?(tier, :plans) do
      assemble_social(user_id)
    else
      %{frequent_contacts: [], group_patterns: []}
    end
  end

  defp gated_relationships(user_id, tier) do
    if TrustTiers.can_access_tier?(tier, :relationships) do
      Relationships.type_map_for(user_id)
    else
      %{}
    end
  end

  defp gated_financial(user_id, tier) do
    if TrustTiers.can_access_tier?(tier, :financial) do
      FinancialProfiles.context_slice(user_id)
    else
      nil
    end
  end

  # Requesting-user Fit only. Explicit client_context — no Pass 2 inference.
  defp gated_fit(client_context) when is_map(client_context) do
    raw = Map.get(client_context, "fit") || Map.get(client_context, :fit)

    case normalize_fit_slice(raw) do
      %{activities: [], goal: nil} -> nil
      slice when is_map(slice) -> slice
      _ -> nil
    end
  end

  defp gated_fit(_), do: nil

  defp normalize_fit_slice(raw) when is_map(raw) do
    activities =
      (Map.get(raw, "activities") || Map.get(raw, :activities) || [])
      |> List.wrap()
      |> Enum.map(&normalize_fit_token/1)
      |> Enum.filter(&(&1 in @fit_activities))
      |> Enum.uniq()
      |> Enum.take(@fit_activity_cap)

    goal =
      case normalize_fit_token(Map.get(raw, "goal") || Map.get(raw, :goal)) do
        g when g in @fit_goals -> g
        _ -> nil
      end

    %{activities: activities, goal: goal}
  end

  defp normalize_fit_slice(_), do: nil

  defp normalize_fit_token(v) when is_binary(v) do
    v |> String.trim() |> String.downcase()
  end

  defp normalize_fit_token(v) when is_atom(v), do: normalize_fit_token(Atom.to_string(v))
  defp normalize_fit_token(_), do: nil

  defp recent_plans(user_id) do
    from(sp in SharedPlan,
      join: pp in PlanParticipant,
      on: pp.plan_id == sp.id,
      where: pp.user_id == ^user_id,
      order_by: [desc: sp.inserted_at],
      limit: 20,
      select: %{
        id: sp.id,
        title: sp.title,
        status: sp.status,
        date: sp.start_at,
        inserted_at: sp.inserted_at
      }
    )
    |> Repo.all()
    |> Enum.map(fn row ->
      date =
        cond do
          match?(%DateTime{}, row.date) -> DateTime.to_iso8601(row.date)
          match?(%DateTime{}, row.inserted_at) -> DateTime.to_iso8601(row.inserted_at)
          true -> nil
        end

      %{
        id: row.id,
        title: row.title,
        status: row.status,
        date: date
      }
    end)
    # Screenshot bug 3 — "What's coming up?" listed Fort Oak ×3 from duplicate
    # tentative rows (Plan this / MultipleResultsError fallout). Keep newest per
    # normalized title, then cap at 5.
    |> dedupe_plans_by_title()
    |> Enum.take(5)
  end

  defp dedupe_plans_by_title(plans) when is_list(plans) do
    plans
    |> Enum.reduce({[], MapSet.new()}, fn plan, {acc, seen} ->
      key = normalize_plan_title(plan[:title] || plan["title"])

      cond do
        key == "" ->
          {acc ++ [plan], seen}

        MapSet.member?(seen, key) ->
          {acc, seen}

        true ->
          {acc ++ [plan], MapSet.put(seen, key)}
      end
    end)
    |> elem(0)
  end

  defp normalize_plan_title(nil), do: ""

  defp normalize_plan_title(title) when is_binary(title) do
    title
    |> String.downcase()
    |> String.replace(~r/\s*\(tentative\)\s*$/i, "")
    |> String.trim()
  end

  defp normalize_plan_title(_), do: ""

  defp upcoming_celebrations(user_id) do
    today = Date.utc_today()

    case Celebrations.list_for_user(user_id) do
      {:ok, list} ->
        list
        |> Enum.take(5)
        |> Enum.map(fn c ->
          %{
            id: c.id,
            name: c.person_name,
            kind: c.kind,
            days_until: Celebrations.days_until(c, today),
            # D-2 — top curated plan idea when known+ with data
            top_idea: CelebrationCuration.top_plan_idea(user_id, c.id)
          }
        end)

      _ ->
        []
    end
  end

  defp active_conversation_count(user_id) do
    from(c in OpalConversation, where: c.user_id == ^user_id)
    |> Repo.aggregate(:count, :id)
  end

  defp assemble_social(user_id) do
    %{
      frequent_contacts: frequent_contacts(user_id),
      group_patterns: group_patterns(user_id)
    }
  end

  defp frequent_contacts(user_id) do
    since = DateTime.utc_now() |> DateTime.add(-30 * 24 * 3600, :second)

    top_ids =
      from(m in Message,
        join: cm in ConversationMember,
        on: cm.conversation_id == m.conversation_id and cm.user_id == ^user_id,
        where: m.inserted_at >= ^since and m.sender_user_id != ^user_id,
        group_by: m.sender_user_id,
        order_by: [desc: count(m.id)],
        limit: 5,
        select: m.sender_user_id
      )
      |> Repo.all()

    if top_ids == [] do
      []
    else
      users =
        from(u in User, where: u.id in ^top_ids, select: {u.id, u.display_name})
        |> Repo.all()
        |> Map.new()

      Enum.map(top_ids, fn id ->
        %{user_id: id, display_name: Map.get(users, id)}
      end)
    end
  end

  defp group_patterns(user_id) do
    # Recent plans the user is on (cap for performance), then load co-participants once.
    plan_ids =
      from(pp in PlanParticipant,
        join: sp in SharedPlan,
        on: sp.id == pp.plan_id,
        where: pp.user_id == ^user_id,
        order_by: [desc: sp.inserted_at],
        limit: 50,
        select: sp.id
      )
      |> Repo.all()

    if plan_ids == [] do
      []
    else
      rows =
        from(pp in PlanParticipant,
          join: u in User,
          on: u.id == pp.user_id,
          where: pp.plan_id in ^plan_ids,
          select: {pp.plan_id, u.id, u.display_name}
        )
        |> Repo.all()

      rows
      |> Enum.group_by(fn {plan_id, _, _} -> plan_id end)
      |> Enum.filter(fn {_plan_id, members} -> length(members) >= 3 end)
      |> Enum.map(fn {_plan_id, members} ->
        ids = members |> Enum.map(fn {_, id, _} -> id end) |> Enum.sort()
        names = members |> Enum.map(fn {_, _, name} -> name end) |> Enum.sort()
        {ids, names}
      end)
      |> Enum.group_by(fn {ids, _names} -> ids end)
      |> Enum.map(fn {_ids, occurrences} ->
        names = occurrences |> hd() |> elem(1)
        %{member_names: names, shared_plan_count: length(occurrences)}
      end)
      |> Enum.sort_by(& &1.shared_plan_count, :desc)
      |> Enum.take(3)
    end
  end

  defp assemble_message(text) do
    %{
      text: text,
      length: String.length(text),
      sent_at: DateTime.utc_now() |> DateTime.to_iso8601()
    }
  end

  # Last N Opal Center messages (role + body + optional intent). Empty when none yet.
  # WS-10: a known session supplies its OWN history; only a session-less
  # call falls back to the user's active session (the pre-orbit path).
  defp assemble_conversation_history(user_id, session \\ nil) do
    conversation =
      case session do
        %OpalConversation{} = s -> s
        _ -> Repo.one(OpalConversation.active_query(user_id))
      end

    case conversation do
      %OpalConversation{id: cid} ->
        OpalConversations.list_messages(cid, @history_limit)
        |> Enum.map(fn %OpalMessage{} = m ->
          intent = history_intent(m.metadata)

          %{
            role: if(m.role == "opal", do: "opal", else: "user"),
            body: m.body || ""
          }
          |> then(fn base ->
            if is_map(intent), do: Map.put(base, :intent, intent), else: base
          end)
        end)

      _ ->
        []
    end
  end

  # Repair #22 (WS-10) — the orbit scope slice for a scoped session.
  # Everything here is read LIVE from the records the session's own
  # birth scope names (the person, the plan, the human thread) — the
  # same records the orbit surface renders — so generation and the
  # room can never disagree about whose orbit this is or what was
  # actually said in its thread. A session with no scope at all
  # (ordinary Center chat) yields nil and generation is unchanged.
  defp assemble_orbit_scope(_user_id, nil), do: nil

  defp assemble_orbit_scope(user_id, %OpalConversation{} = session) do
    person =
      case session.context_person_id do
        pid when is_binary(pid) ->
          case Repo.get(User, pid) do
            %User{} = u -> %{id: u.id, display_name: u.display_name}
            _ -> nil
          end

        _ ->
          nil
      end

    anchor =
      if is_binary(session.anchor_type) and is_binary(session.anchor_id) do
        label =
          case session.anchor_type do
            "person" ->
              case Repo.get(User, session.anchor_id) do
                %User{} = u -> u.display_name
                _ -> session.anchor_label
              end

            _ ->
              session.anchor_label
          end

        %{type: session.anchor_type, id: session.anchor_id, label: label}
      else
        nil
      end

    plan =
      case session.context_plan_id do
        plan_id when is_binary(plan_id) ->
          case Repo.get(OpalCore.SocialFlow.SharedPlan, plan_id) do
            %OpalCore.SocialFlow.SharedPlan{} = p ->
              %{id: p.id, title: p.title, time_label: p.time_label}

            _ ->
              nil
          end

        _ ->
          nil
      end

    thread =
      case session.context_conversation_id do
        cid when is_binary(cid) -> %{conversation_id: cid, messages: thread_messages(user_id, cid)}
        _ -> nil
      end

    if is_nil(person) and is_nil(anchor) and is_nil(plan) and is_nil(thread) do
      nil
    else
      %{
        session_id: session.id,
        anchor: anchor,
        person: person,
        plan: plan,
        thread: thread
      }
    end
  end

  # The anchored human thread's recent messages (last 10, ascending),
  # speaker-attributed. Only real message bodies — the thread's own
  # words are the scoped context a suggestion inside this orbit must
  # be derived from. Membership was validated at the session's birth
  # (create_scoped_session), and the read is keyed on the session's
  # own stored conversation id, never a client-supplied one.
  defp thread_messages(viewer_id, conversation_id) do
    rows =
      from(m in Message,
        where: m.conversation_id == ^conversation_id,
        order_by: [desc: m.server_seq, desc: m.inserted_at],
        limit: @history_limit
      )
      |> Repo.all()
      |> Enum.reverse()

    names =
      rows
      |> Enum.map(& &1.sender_user_id)
      |> Enum.uniq()
      |> then(fn ids ->
        from(u in User, where: u.id in ^ids, select: {u.id, u.display_name})
        |> Repo.all()
        |> Map.new()
      end)

    Enum.map(rows, fn m ->
      %{
        role: if(m.sender_user_id == viewer_id, do: "viewer", else: "peer"),
        speaker: Map.get(names, m.sender_user_id),
        body: m.body || ""
      }
    end)
  end

  defp history_intent(%{"intent" => intent}) when is_map(intent), do: intent
  defp history_intent(%{intent: intent}) when is_map(intent), do: intent
  defp history_intent(_), do: nil
end
