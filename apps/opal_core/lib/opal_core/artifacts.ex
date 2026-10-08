defmodule OpalCore.Artifacts do
  @moduledoc """
  Paste G Phase 9 — shareable branded HTML artifacts from real plan/trip/booking data.

  Kinds: `trip_itinerary` (plan_id = Trip id), `event_plan` (plan_id = SharedPlan id).

  **Invent-nothing:** HTML facts come only from stored plan/trip/booking rows.
  Missing fields are omitted or labeled "TBD". Never invent flights, hotels, or costs.

  **Versioning policy (chosen):** when a plan changes and a new artifact is generated,
  prior versions are marked `outdated_at` but their signed URLs **keep working** and
  show a banner "A newer version of this plan is available…". We do **not** redirect
  old links to latest — the shared snapshot remains stable for recipients.

  Share URLs are opaque-token routes (`GET /share/artifacts/:token`), not public
  indexable listings (`noindex,nofollow` in HTML).
  """

  import Ecto.Query

  alias OpalCore.Artifacts.Artifact
  alias OpalCore.Artifacts.Html
  alias OpalCore.Bookings.Booking
  alias OpalCore.PublicBaseUrl
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Trips
  alias OpalCore.Trips.Trip

  @ttl_days 30
  @token_bytes 24

  @doc """
  Generate (or regenerate) an artifact for a source object.

  On fingerprint change: mark prior current versions outdated, insert new version.
  Same fingerprint → return existing current artifact (idempotent).
  """
  def generate(account_id, kind, plan_id, opts \\ [])

  def generate(account_id, kind, plan_id, opts)
      when is_binary(account_id) and is_binary(kind) and is_binary(plan_id) do
    with :ok <- validate_kind(kind),
         {:ok, facts} <- collect_facts(account_id, kind, plan_id),
         fingerprint <- fingerprint(facts),
         {:ok, current} <- current_artifact(account_id, kind, plan_id) do
      cond do
        match?(%Artifact{}, current) and current.source_fingerprint == fingerprint ->
          {:ok, preview_payload(current, facts)}

        true ->
          create_version(account_id, kind, plan_id, facts, fingerprint, current, opts)
      end
    end
  end

  def generate(_, _, _, _), do: {:error, :invalid}

  @doc "Load artifact by opaque share token (expired → :expired)."
  def get_by_token(token) when is_binary(token) do
    case Repo.get_by(Artifact, signed_token: token) do
      nil ->
        {:error, :not_found}

      %Artifact{} = art ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        if DateTime.compare(now, art.expires_at) == :gt do
          {:error, :expired}
        else
          {:ok, art}
        end
    end
  end

  def get_by_token(_), do: {:error, :not_found}

  @doc """
  HTML for share route.

  Uses the **stored** HTML snapshot (not live rehydrate) so old signed links stay
  stable. When a newer version exists, injects the "newer version available" banner.
  """
  def render_share_html(%Artifact{} = art) do
    newer? = not is_nil(art.outdated_at) or newer_exists?(art)
    html = art.html_or_path || ""

    html =
      if newer? and not String.contains?(html, "newer version") do
        String.replace(
          html,
          "<div class=\"card\">",
          "<div class=\"card\">" <>
            ~s(<div class="banner" role="status">A newer version of this plan is available. This link still shows the version that was shared.</div>),
          global: false
        )
      else
        html
      end

    {:ok, html}
  end

  @doc "Preview card JSON for in-thread / product API."
  def preview_payload(%Artifact{} = art, facts \\ nil) do
    facts =
      cond do
        is_map(facts) ->
          facts

        true ->
          case rehydrate_facts(art) do
            {:ok, f} -> f
            _ -> %{title: "Opal plan"}
          end
      end

    title = Map.get(facts, :title) || "Opal plan"
    subtitle = preview_subtitle(art.kind, facts)

    %{
      artifact_id: art.id,
      kind: art.kind,
      plan_id: art.plan_id,
      version: art.version,
      title: title,
      subtitle: subtitle,
      share_url: share_url(art),
      expires_at: DateTime.to_iso8601(art.expires_at),
      outdated: not is_nil(art.outdated_at),
      source_fingerprint: art.source_fingerprint,
      preview_card: %{
        title: title,
        subtitle: subtitle,
        kind: art.kind,
        brand: %{
          cyan: "#00E5FF",
          gold: "#FFC86B",
          midnight: "#050816",
          ink: "#0B1226"
        },
        cta: "Open shared plan",
        footer: "Made with Opal"
      }
    }
  end

  @doc "Absolute share URL for an artifact."
  def share_url(%Artifact{signed_token: token}) when is_binary(token) do
    PublicBaseUrl.url("/share/artifacts/#{URI.encode_www_form(token)}")
  end

  def share_url(_), do: PublicBaseUrl.url("/share/artifacts")

  @doc """
  Collect facts ONLY from durable rows. Never invent missing travel/cost data.
  """
  def collect_facts(account_id, "trip_itinerary", trip_id)
      when is_binary(account_id) and is_binary(trip_id) do
    with {:ok, trip} <- Trips.get_trip_for_user(trip_id, account_id) do
      trip = preload_canvas(trip)
      people = trip_people(trip)
      days = trip_days_facts(trip)
      bookings = bookings_for_source(account_id, trip_id)

      {:ok,
       %{
         kind: "trip_itinerary",
         title: trip.title,
         destination: blank_to_nil(trip.destination_label),
         starts_on: date_iso(trip.starts_on),
         ends_on: date_iso(trip.ends_on),
         people: people,
         days: days,
         bookings: bookings
       }}
    end
  end

  def collect_facts(account_id, "event_plan", plan_id)
      when is_binary(account_id) and is_binary(plan_id) do
    with {:ok, plan} <- get_plan_for_user(plan_id, account_id) do
      people = plan_people(plan)
      bookings = bookings_for_source(account_id, plan_id)

      {:ok,
       %{
         kind: "event_plan",
         title: plan.title,
         location: blank_to_nil(plan.location),
         time_label: blank_to_nil(plan.time_label),
         start_at: dt_iso(plan.start_at),
         end_at: dt_iso(plan.end_at),
         status: plan.status,
         timezone: plan.timezone,
         people: people,
         bookings: bookings
       }}
    end
  end

  def collect_facts(_, _, _), do: {:error, :invalid}

  # --- internals ---

  defp create_version(account_id, kind, plan_id, facts, fingerprint, current, _opts) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    next_version = if current, do: current.version + 1, else: 1

    html =
      facts
      |> Map.put(:invite_path, invite_path())
      |> Map.put(:newer_version_available, false)
      |> Html.render()

    token = mint_token()

    Repo.transaction(fn ->
      if current do
        from(a in Artifact,
          where:
            a.account_id == ^account_id and a.kind == ^kind and a.plan_id == ^plan_id and
              is_nil(a.outdated_at)
        )
        |> Repo.update_all(set: [outdated_at: now, updated_at: now])
      end

      %Artifact{}
      |> Artifact.changeset(%{
        account_id: account_id,
        kind: kind,
        plan_id: plan_id,
        version: next_version,
        html_or_path: html,
        signed_token: token,
        expires_at: DateTime.add(now, @ttl_days * 24 * 3600, :second),
        source_fingerprint: fingerprint
      })
      |> Repo.insert!()
    end)
    |> case do
      {:ok, art} -> {:ok, preview_payload(art, facts)}
      {:error, reason} -> {:error, reason}
    end
  end

  defp current_artifact(account_id, kind, plan_id) do
    art =
      from(a in Artifact,
        where:
          a.account_id == ^account_id and a.kind == ^kind and a.plan_id == ^plan_id and
            is_nil(a.outdated_at),
        order_by: [desc: a.version],
        limit: 1
      )
      |> Repo.one()

    {:ok, art}
  end

  defp newer_exists?(%Artifact{} = art) do
    from(a in Artifact,
      where:
        a.account_id == ^art.account_id and a.kind == ^art.kind and a.plan_id == ^art.plan_id and
          a.version > ^art.version,
      select: count(a.id)
    )
    |> Repo.one()
    |> Kernel.>(0)
  end

  defp rehydrate_facts(%Artifact{kind: kind, plan_id: plan_id, account_id: account_id}) do
    collect_facts(account_id, kind, plan_id)
  end

  defp fingerprint(facts) when is_map(facts) do
    canonical =
      facts
      |> Map.drop([:newer_version_available, :invite_path])
      |> Jason.encode!()

    :crypto.hash(:sha256, canonical) |> Base.encode16(case: :lower)
  end

  defp validate_kind(kind) when kind in ["trip_itinerary", "event_plan"], do: :ok
  defp validate_kind(_), do: {:error, :invalid_kind}

  defp get_plan_for_user(plan_id, user_id) do
    case Repo.get(SharedPlan, plan_id) do
      nil ->
        {:error, :not_found}

      %SharedPlan{} = plan ->
        if plan.created_by_user_id == user_id or plan_participant?(plan_id, user_id) do
          {:ok, plan}
        else
          {:error, :not_found}
        end
    end
  end

  defp plan_participant?(plan_id, user_id) do
    from(p in PlanParticipant, where: p.plan_id == ^plan_id and p.user_id == ^user_id, select: 1, limit: 1)
    |> Repo.one()
    |> is_integer()
  end

  defp preload_canvas(%Trip{} = trip) do
    Repo.preload(trip,
      participants: [],
      days: [time_blocks: [activities: []]]
    )
  end

  defp trip_people(%Trip{} = trip) do
    creator = trip.created_by_user_id

    names =
      (trip.participants || [])
      |> Enum.map(& &1.user_id)
      |> then(fn ids -> if creator in ids, do: ids, else: [creator | ids] end)
      |> Enum.uniq()
      |> display_names()

    names
  end

  defp plan_people(%SharedPlan{} = plan) do
    ids =
      from(p in PlanParticipant, where: p.plan_id == ^plan.id, select: p.user_id)
      |> Repo.all()

    ids =
      if plan.created_by_user_id in ids,
        do: ids,
        else: [plan.created_by_user_id | ids]

    display_names(Enum.uniq(ids))
  end

  defp display_names(user_ids) do
    from(u in OpalCore.Accounts.User,
      where: u.id in ^user_ids,
      select: {u.id, u.display_name, u.handle}
    )
    |> Repo.all()
    |> Map.new(fn {id, name, handle} -> {id, name || handle || id} end)
    |> then(fn map -> Enum.map(user_ids, &Map.get(map, &1, &1)) end)
  end

  defp trip_days_facts(%Trip{days: days}) when is_list(days) do
    days
    |> Enum.sort_by(& &1.day_index)
    |> Enum.map(fn day ->
      activities =
        (day.time_blocks || [])
        |> Enum.sort_by(& &1.position)
        |> Enum.flat_map(fn block ->
          (block.activities || [])
          |> Enum.sort_by(& &1.position)
          |> Enum.map(fn a ->
            %{
              venue_name: a.venue_name,
              venue_area: blank_to_nil(a.venue_area),
              activity_kind: a.activity_kind,
              time_label: blank_to_nil(block.time_label)
            }
          end)
          |> then(fn acts ->
            if acts == [] and block.block_kind == "free" do
              [%{title: block.title || "Free time", time_label: blank_to_nil(block.time_label)}]
            else
              acts
            end
          end)
        end)

      %{
        label: day.label,
        on_date: date_iso(day.on_date),
        activities: activities
      }
    end)
  end

  defp trip_days_facts(_), do: []

  defp bookings_for_source(account_id, source_id) do
    from(b in Booking,
      where: b.account_id == ^account_id and b.plan_id == ^source_id,
      order_by: [asc: b.inserted_at]
    )
    |> Repo.all()
    |> Enum.map(fn b ->
      %{
        booking_type: b.booking_type,
        status: b.status,
        confirmation_number: b.confirmation_number,
        amount_cents: b.amount_cents,
        currency: b.currency
      }
    end)
  end

  defp preview_subtitle("trip_itinerary", facts) do
    dest = facts[:destination]
    dates = date_range_label(facts[:starts_on], facts[:ends_on])

    [dest, dates]
    |> Enum.reject(&(is_nil(&1) or &1 == "" or &1 == :tbd))
    |> Enum.join(" · ")
    |> case do
      "" -> "Trip itinerary"
      s -> s
    end
  end

  defp preview_subtitle("event_plan", facts) do
    when_ =
      cond do
        is_binary(facts[:time_label]) and facts[:time_label] != "" -> facts[:time_label]
        is_binary(facts[:start_at]) -> facts[:start_at]
        true -> nil
      end

    [facts[:location], when_]
    |> Enum.reject(&(is_nil(&1) or &1 == ""))
    |> Enum.join(" · ")
    |> case do
      "" -> "Event plan"
      s -> s
    end
  end

  defp preview_subtitle(_, _), do: "Shared with Opal"

  defp date_range_label(nil, nil), do: nil
  defp date_range_label(a, nil), do: a
  defp date_range_label(nil, b), do: b
  defp date_range_label(a, b), do: "#{a} → #{b}"

  defp invite_path do
    PublicBaseUrl.url("/invite")
  end

  defp mint_token do
    :crypto.strong_rand_bytes(@token_bytes) |> Base.url_encode64(padding: false)
  end

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(""), do: nil
  defp blank_to_nil(s), do: s

  defp date_iso(nil), do: nil
  defp date_iso(%Date{} = d), do: Date.to_iso8601(d)

  defp dt_iso(nil), do: nil
  defp dt_iso(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
