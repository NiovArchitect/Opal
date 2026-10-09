defmodule OpalCore.Lives.Verification do
  @moduledoc """
  Paste K Phase V — venue verification securities.

  V.1 allowlist (Places place_id only; residential reject)
  V.2 7-day new-venue quarantine
  V.3 presence honesty (crowd reports; QR scan path)
  V.4 rate limits + duplicate place merge
  V.5 venue report categories into safety queue
  """

  import Ecto.Query

  alias OpalCore.Lives.{
    LivePresenceReport,
    LiveRoom,
    Venue,
    VenuePresenceScan
  }

  alias OpalCore.Places
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{SafetyReport, TrustSafety}

  @quarantine_days 7
  @max_new_venues_per_host_week 3
  @max_lives_per_venue_per_host_day 5
  @presence_flag_threshold 3

  @residential_only_types MapSet.new(~w(
    street_address premise subpremise residential_area private_dwelling
  ))

  @public_venue_types MapSet.new(~w(
    bar restaurant cafe night_club food lodging hotel store shopping_mall
    museum art_gallery stadium park tourist_attraction amusement_park
    bowling_alley movie_theater gym spa bakery meal_takeaway meal_delivery
    point_of_interest establishment
  ))

  @venue_report_categories ~w(fake_venue not_a_real_place host_isnt_here)

  def quarantine_days, do: @quarantine_days
  def max_new_venues_per_host_week, do: @max_new_venues_per_host_week
  def max_lives_per_venue_per_host_day, do: @max_lives_per_venue_per_host_day
  def presence_flag_threshold, do: @presence_flag_threshold
  def venue_report_categories, do: @venue_report_categories

  @doc """
  Resolve or create a venue from a Places place_id.
  Rejects free-text / missing place_id / residential.
  Provisional `test-<slug>` place_ids skip Places when allow_provisional/allow_fixture.
  """
  def resolve_venue(place_id, opts \\ [])

  def resolve_venue(place_id, opts) when is_binary(place_id) do
    id = place_id |> String.trim() |> strip_places_prefix()

    cond do
      id == "" ->
        {:error, :place_id_required}

      provisional_place_id?(id) ->
        if Keyword.get(opts, :allow_provisional, false) or Keyword.get(opts, :allow_fixture, false) do
          case Repo.get_by(Venue, place_id: id) do
            %Venue{} = v -> {:ok, maybe_graduate_quarantine(v), :existing}
            nil -> insert_provisional_venue(id, opts)
          end
        else
          {:error, :provisional_not_allowed}
        end

      free_text_rejected?(id, opts) ->
        {:error, :venue_not_found}

      true ->
        case Repo.get_by(Venue, place_id: id) do
          %Venue{status: "merged", canonical_venue_id: canon} when is_binary(canon) ->
            case Repo.get(Venue, canon) do
              %Venue{} = c -> {:ok, c, :merged}
              nil -> upsert_from_places(id, opts)
            end

          %Venue{} = v ->
            {:ok, maybe_graduate_quarantine(v), :existing}

          nil ->
            upsert_from_places(id, opts)
        end
    end
  end

  def resolve_venue(_, _), do: {:error, :place_id_required}

  @doc """
  Create a provisional testing venue from name + city.
  place_id = test-<slug>. Always quarantine; stickers disabled.
  """
  def create_provisional_venue(name, city, opts \\ [])
      when is_binary(name) and is_binary(city) do
    name = String.trim(name)
    city = String.trim(city)

    cond do
      name == "" or city == "" ->
        {:error, :name_and_city_required}

      not (Keyword.get(opts, :allow_provisional, false) or Keyword.get(opts, :allow_fixture, false)) ->
        {:error, :provisional_not_allowed}

      true ->
        place_id = provisional_place_id(name, city)
        resolve_venue(place_id,
          Keyword.merge(opts,
            name: name,
            address: city,
            types: ["establishment", "point_of_interest"],
            allow_provisional: true
          )
        )
    end
  end

  def provisional_place_id?(id) when is_binary(id), do: String.starts_with?(id, "test-")
  def provisional_place_id?(_), do: false

  def provisional_place_id(name, city) when is_binary(name) and is_binary(city) do
    slug =
      (name <> "-" <> city)
      |> String.downcase()
      |> String.replace(~r/[^a-z0-9]+/u, "-")
      |> String.trim("-")
      |> String.slice(0, 48)

    slug = if slug == "", do: Base.encode16(:crypto.strong_rand_bytes(4), case: :lower), else: slug
    "test-" <> slug
  end

  @doc """
  Venue autocomplete via Places text search.
  Returns {:ok, candidates} | {:ok, [], :empty} | {:error, :places_unavailable, msg}.
  """
  def search_venues(query) when is_binary(query) do
    q = String.trim(query)

    if q == "" do
      {:error, :query_required}
    else
      case Places.search_text(%{"text_query" => q, "max_result_count" => 5}) do
        {:ok, %{"candidates" => candidates}} when is_list(candidates) and candidates != [] ->
          {:ok,
           Enum.map(candidates, fn c ->
             %{
               "place_id" => c["id"] || c["provider_place_id"] || c["place_id"],
               "name" => c["name"] || c["display_name"],
               "formatted_address" => c["address"] || c["formatted_address"] || c["area_label"],
               "types" => List.wrap(c["categories"] || c["types"])
             }
           end)}

        {:ok, _} ->
          {:ok, [], :empty}

        {:disabled, reason} ->
          {:error, :places_unavailable, reason}

        {:error, reason} ->
          {:error, :places_unavailable, inspect(reason)}
      end
    end
  end

  def search_venues(_), do: {:error, :query_required}

  @doc "Reject free-text venue names at go-live."
  def reject_free_text(name) when is_binary(name) do
    {:error, :venue_not_found,
     "we couldn't find that venue — try searching"}
  end

  def reject_free_text(_), do: {:error, :venue_not_found}

  @doc "Residential / non-venue Places types → lives happen at venues."
  def residential?(types) when is_list(types) do
    type_set = types |> Enum.map(&to_string/1) |> MapSet.new()
    public_hits = MapSet.intersection(type_set, @public_venue_types)
    residential_hits = MapSet.intersection(type_set, @residential_only_types)

    cond do
      types == [] ->
        true

      MapSet.size(residential_hits) > 0 and MapSet.size(public_hits) == 0 ->
        true

      MapSet.size(public_hits) > 0 ->
        false

      true ->
        # Unclassified — reject (allowlist posture)
        true
    end
  end

  def residential?(_), do: true

  def residential_reject_message, do: "lives happen at venues"

  @doc "V.4 — max 3 new venues/host/week."
  def check_new_venue_rate(host_account_id) when is_binary(host_account_id) do
    since = DateTime.utc_now() |> DateTime.add(-7 * 24 * 3600, :second)

    count =
      from(r in LiveRoom,
        join: v in Venue,
        on: v.id == r.venue_id,
        where:
          r.host_account_id == ^host_account_id and
            v.first_live_at >= ^since and
            v.first_live_at == r.started_at,
        select: count(v.id)
      )
      |> Repo.one()

    # Broader: count distinct venues first-seen by this host this week via metadata
    host_new =
      from(v in Venue,
        where:
          fragment("(?->>'introduced_by') = ?", v.metadata, ^host_account_id) and
            v.inserted_at >= ^since,
        select: count(v.id)
      )
      |> Repo.one()

    if (host_new || 0) >= @max_new_venues_per_host_week do
      {:error, :new_venue_rate_limited}
    else
      :ok
    end
  end

  def check_new_venue_rate(_), do: {:error, :invalid}

  @doc "V.4 — max 5 lives/venue/day per host."
  def check_lives_per_venue_day(host_account_id, venue_id)
      when is_binary(host_account_id) and is_binary(venue_id) do
    start_of_day = DateTime.utc_now() |> DateTime.to_date() |> DateTime.new!(~T[00:00:00], "Etc/UTC")

    count =
      from(r in LiveRoom,
        where:
          r.host_account_id == ^host_account_id and
            r.venue_id == ^venue_id and
            r.started_at >= ^start_of_day,
        select: count(r.id)
      )
      |> Repo.one()

    if (count || 0) >= @max_lives_per_venue_per_host_day do
      {:error, :venue_live_rate_limited}
    else
      :ok
    end
  end

  def check_lives_per_venue_day(_, _), do: {:error, :invalid}

  @doc "V.3 — one-tap host isn't here. 3+ → flag live, freeze heat, warn host."
  def report_host_not_here(live_room_id, reporter_account_id)
      when is_binary(live_room_id) and is_binary(reporter_account_id) do
    case Repo.get(LiveRoom, live_room_id) do
      %LiveRoom{host_account_id: ^reporter_account_id} ->
        {:error, :cannot_report_own_live}

      %LiveRoom{} = room ->
        cs =
          %LivePresenceReport{}
          |> LivePresenceReport.changeset(%{
            live_room_id: live_room_id,
            reporter_account_id: reporter_account_id,
            kind: "host_isnt_here"
          })

        case Repo.insert(cs) do
          {:ok, report} ->
            count = room.presence_report_count + 1

            attrs =
              if count >= @presence_flag_threshold do
                %{
                  presence_report_count: count,
                  heat_contribution_frozen: true,
                  status: "flagged",
                  metadata:
                    Map.merge(room.metadata || %{}, %{
                      "presence_warned_host" => true,
                      "presence_flagged_at" => DateTime.to_iso8601(DateTime.utc_now())
                    })
                }
              else
                %{presence_report_count: count}
              end

            {:ok, updated} =
              room
              |> LiveRoom.changeset(attrs)
              |> Repo.update()

            # Enqueue safety report for human review queue (best-effort — presence
            # report itself is the durable product signal).
            queue_result =
              try do
                enqueue_venue_report(%{
                  reporter_user_id: reporter_account_id,
                  reported_user_id: room.host_account_id,
                  category: "host_isnt_here",
                  subject_venue_id: room.venue_id,
                  subject_live_room_id: room.id,
                  idempotency_key: "presence:#{live_room_id}:#{reporter_account_id}"
                })
              rescue
                e in [Ecto.ConstraintError, Ecto.InvalidChangesetError] ->
                  {:error, e}
              end

            {:ok,
             %{
               report: report,
               live_room: updated,
               flagged: count >= @presence_flag_threshold,
               safety_queue: queue_result
             }}

          {:error, %Ecto.Changeset{} = cs} ->
            if unique_reporter_error?(cs) do
              {:error, :already_reported}
            else
              {:error, cs}
            end
        end

      nil ->
        {:error, :not_found}
    end
  end

  def report_host_not_here(_, _), do: {:error, :invalid}

  @doc "V.3 — scan venue presence QR (build path now; claim later)."
  def scan_presence(pay_or_presence_token, scanner_account_id, opts \\ [])
      when is_binary(pay_or_presence_token) and is_binary(scanner_account_id) do
    case Repo.get_by(Venue, pay_token: pay_or_presence_token) do
      %Venue{} = venue ->
        live_room_id = Keyword.get(opts, :live_room_id)

        {:ok, scan} =
          %VenuePresenceScan{}
          |> VenuePresenceScan.changeset(%{
            venue_id: venue.id,
            live_room_id: live_room_id,
            scanner_account_id: scanner_account_id,
            verified: true
          })
          |> Repo.insert()

        {:ok, %{scan: scan, venue: venue, verified_presence: true}}

      nil ->
        {:error, :invalid_token}
    end
  end

  def scan_presence(_, _, _), do: {:error, :invalid}

  @doc "V.5 — enqueue venue report into safety queue."
  def enqueue_venue_report(attrs) when is_map(attrs) do
    category = to_string(attrs[:category] || attrs["category"] || "other")

    unless category in @venue_report_categories or category in SafetyReport.categories() do
      {:error, :invalid_category}
    else
      reporter = attrs[:reporter_user_id] || attrs["reporter_user_id"]
      reported = attrs[:reported_user_id] || attrs["reported_user_id"] || reporter
      idem = attrs[:idempotency_key] || attrs["idempotency_key"] || Ecto.UUID.generate()

      report_attrs = %{
        reporter_user_id: reporter,
        reported_user_id: reported,
        category: category,
        note: attrs[:note] || attrs["note"],
        idempotency_key: idem,
        subject_venue_id: attrs[:subject_venue_id] || attrs["subject_venue_id"],
        subject_live_room_id: attrs[:subject_live_room_id] || attrs["subject_live_room_id"],
        triage_proposal: %{
          "venue_id" => attrs[:subject_venue_id] || attrs["subject_venue_id"],
          "live_room_id" => attrs[:subject_live_room_id] || attrs["subject_live_room_id"],
          "kind" => "venue_report"
        }
      }

      TrustSafety.create_report(report_attrs)
    end
  end

  def maybe_graduate_quarantine(%Venue{status: "quarantine", quarantine_until: until} = v)
      when not is_nil(until) do
    if DateTime.compare(DateTime.utc_now(), until) != :lt and (v.fraud_flags || 0) == 0 do
      case v |> Venue.changeset(%{status: "full"}) |> Repo.update() do
        {:ok, updated} -> updated
        _ -> v
      end
    else
      v
    end
  end

  def maybe_graduate_quarantine(%Venue{} = v), do: v

  @doc "Detect duplicate address → merge to canonical."
  def maybe_merge_duplicate(%Venue{} = venue) do
    addr = venue.formatted_address

    if is_binary(addr) and String.trim(addr) != "" do
      sibling =
        from(v in Venue,
          where:
            v.id != ^venue.id and v.formatted_address == ^addr and v.status != "merged",
          order_by: [asc: v.inserted_at],
          limit: 1
        )
        |> Repo.one()

      case sibling do
        %Venue{} = canon ->
          _ =
            venue
            |> Venue.changeset(%{
              status: "merged",
              canonical_venue_id: canon.id,
              metadata:
                Map.merge(venue.metadata || %{}, %{
                  "merged_into" => canon.id,
                  "merge_logged_at" => DateTime.to_iso8601(DateTime.utc_now())
                })
            })
            |> Repo.update()

          {:merged, canon}

        nil ->
          {:ok, venue}
      end
    else
      {:ok, venue}
    end
  end

  # --- internals ---

  defp upsert_from_places(place_id, opts) do
    case fetch_place_details(place_id, opts) do
      {:ok, details} ->
        types = List.wrap(details["types"] || details[:types])

        if residential?(types) or details["residential"] == true do
          {:error, :residential, residential_reject_message()}
        else
          name = details["name"] || details[:name] || "Venue"
          addr = details["formatted_address"] || details["address"]
          now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
          introduced_by = Keyword.get(opts, :introduced_by)

          if is_binary(introduced_by) do
            case check_new_venue_rate(introduced_by) do
              :ok -> :ok
              {:error, _} = err -> throw(err)
            end
          end

          attrs = %{
            place_id: place_id,
            name: name,
            formatted_address: addr,
            types: Enum.map(types, &to_string/1),
            residential: false,
            status: Keyword.get(opts, :status) || "quarantine",
            quarantine_until: DateTime.add(now, @quarantine_days * 24 * 3600, :second),
            pay_token: generate_pay_token(),
            metadata: %{
              "introduced_by" => introduced_by,
              "source" => details["source"] || "google_places"
            }
          }

          case %Venue{} |> Venue.changeset(attrs) |> Repo.insert() do
            {:ok, venue} ->
              case maybe_merge_duplicate(venue) do
                {:merged, canon} -> {:ok, canon, :merged}
                {:ok, v} -> {:ok, v, :created}
              end

            {:error, %Ecto.Changeset{} = cs} ->
              if unique_place_error?(cs) do
                case Repo.get_by(Venue, place_id: place_id) do
                  %Venue{} = v -> {:ok, maybe_graduate_quarantine(v), :existing}
                  nil -> {:error, cs}
                end
              else
                {:error, cs}
              end
          end
        end

      {:disabled, _} ->
        # Tests / offline: allow fixture place_ids when resolver opts in
        maybe_insert_fixture(place_id, opts, :places_unavailable)

      {:error, :not_found} ->
        maybe_insert_fixture(
          place_id,
          opts,
          {:venue_not_found, "we couldn't find that venue — try searching"}
        )

      {:error, _} ->
        # Places key present but API blocked / misconfigured — still allow fixtures
        maybe_insert_fixture(
          place_id,
          opts,
          {:venue_not_found, "we couldn't find that venue — try searching"}
        )
    end
  catch
    {:error, _} = err -> err
  end

  defp maybe_insert_fixture(place_id, opts, error_atom_or_tuple) do
    if Keyword.get(opts, :allow_fixture, false) or fixture_place?(place_id) do
      insert_fixture_venue(place_id, opts)
    else
      case error_atom_or_tuple do
        atom when is_atom(atom) -> {:error, atom}
        {atom, msg} -> {:error, atom, msg}
      end
    end
  end

  defp fetch_place_details(place_id, opts) do
    case Keyword.get(opts, :details) do
      %{} = d ->
        {:ok, d}

      _ ->
        resolver = Application.get_env(:opal_core, :lives_places_resolver, Places)

        cond do
          resolver == Places ->
            Places.get_details(place_id)

          is_atom(resolver) and function_exported?(resolver, :get_details, 1) ->
            resolver.get_details(place_id)

          is_atom(resolver) and function_exported?(resolver, :get_details, 2) ->
            resolver.get_details(place_id, [])

          true ->
            Places.get_details(place_id)
        end
    end
  end

  defp insert_fixture_venue(place_id, opts) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    residential? = String.contains?(place_id, "residential") or Keyword.get(opts, :residential, false)

    if residential? do
      {:error, :residential, residential_reject_message()}
    else
      introduced_by = Keyword.get(opts, :introduced_by)

      if is_binary(introduced_by) do
        case check_new_venue_rate(introduced_by) do
          :ok -> :ok
          {:error, _} = err -> throw(err)
        end
      end

      test? = provisional_place_id?(place_id) or Keyword.get(opts, :test_only, false)

      attrs = %{
        place_id: place_id,
        name: Keyword.get(opts, :name, "Fixture Venue"),
        formatted_address: Keyword.get(opts, :address, "100 Fixture Ave"),
        types: Keyword.get(opts, :types, ["bar", "establishment"]),
        residential: false,
        status: Keyword.get(opts, :status) || "quarantine",
        quarantine_until: DateTime.add(now, @quarantine_days * 24 * 3600, :second),
        pay_token: generate_pay_token(),
        metadata: %{
          "introduced_by" => introduced_by,
          "source" => if(test?, do: "provisional_testing", else: "fixture"),
          "test_only" => test?,
          "test_venue_badge" => if(test?, do: "TEST VENUE", else: nil)
        }
      }

      case %Venue{} |> Venue.changeset(attrs) |> Repo.insert() do
        {:ok, v} -> {:ok, v, :created}
        {:error, %Ecto.Changeset{} = cs} ->
          if unique_place_error?(cs) do
            {:ok, Repo.get_by!(Venue, place_id: place_id), :existing}
          else
            {:error, cs}
          end
      end
    end
  catch
    {:error, _} = err -> err
  end

  defp insert_provisional_venue(place_id, opts) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    name = Keyword.get(opts, :name) || "Test Venue"
    city = Keyword.get(opts, :address) || Keyword.get(opts, :city) || "Test City"
    introduced_by = Keyword.get(opts, :introduced_by)

    if is_binary(introduced_by) do
      case check_new_venue_rate(introduced_by) do
        :ok -> :ok
        {:error, _} = err -> throw(err)
      end
    end

    attrs = %{
      place_id: place_id,
      name: name,
      formatted_address: city,
      types: Keyword.get(opts, :types, ["establishment", "point_of_interest"]),
      residential: false,
      status: "quarantine",
      quarantine_until: DateTime.add(now, @quarantine_days * 24 * 3600, :second),
      pay_token: generate_pay_token(),
      metadata: %{
        "introduced_by" => introduced_by,
        "source" => "provisional_testing",
        "test_only" => true,
        "test_venue_badge" => "TEST VENUE"
      }
    }

    case %Venue{} |> Venue.changeset(attrs) |> Repo.insert() do
      {:ok, v} ->
        {:ok, v, :created}

      {:error, %Ecto.Changeset{} = cs} ->
        if unique_place_error?(cs) do
          {:ok, Repo.get_by!(Venue, place_id: place_id), :existing}
        else
          {:error, cs}
        end
    end
  catch
    {:error, _} = err -> err
  end

  defp fixture_place?(id),
    do:
      String.starts_with?(id, "fixture_") or String.starts_with?(id, "ChIJ_test") or
        provisional_place_id?(id)

  defp free_text_rejected?(id, opts) do
    # Explicit free-text path: callers pass place_id: nil and name only → handled upstream.
    # Guard: obviously non-place_id strings without ChIJ / fixture / test- prefix when force_places.
    Keyword.get(opts, :require_places_shaped, false) and
      not (String.starts_with?(id, "ChIJ") or fixture_place?(id))
  end

  defp generate_pay_token do
    "vq_" <> Base.url_encode64(:crypto.strong_rand_bytes(24), padding: false)
  end

  defp strip_places_prefix("places/" <> rest), do: rest
  defp strip_places_prefix(id), do: id

  defp unique_place_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:place_id, {_, meta}} -> meta[:constraint] == :unique
      _ -> false
    end)
  end

  defp unique_reporter_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {_, {_, meta}} -> meta[:constraint] == :unique
      _ -> false
    end)
  end
end
