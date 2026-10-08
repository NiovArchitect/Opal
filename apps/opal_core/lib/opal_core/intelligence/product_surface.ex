defmodule OpalCore.Intelligence.ProductSurface do
  @moduledoc """
  Paste F — product HTTP facade over existing intelligence modules.

  ## Endpoint inventory (all `product_auth`, account-scoped, foreign → 404)

  | Route | Owner |
  |---|---|
  | GET  /intelligence/people/:person_id/memory | PersonMemory, Routine, TemporalAnchor, OutcomeSignal, RelationshipBehaviorProfile |
  | PATCH /intelligence/people/:person_id/facts/:key | PersonMemory known_facts |
  | DELETE /intelligence/people/:person_id/facts/:key | archive fact (confirm required) |
  | POST /intelligence/people/:person_id/facts/:key/confirm | provenance confirm/wrong |
  | GET  /intelligence/mediation | GroupDecisionState list for owner |
  | GET  /intelligence/groups/:conversation_id/mediation | GroupDecision + GroupCoordinator |
  | POST /intelligence/mediation/:id/send | owner_draft + outbox |
  | POST /intelligence/mediation/:id/dismiss | GroupDecision.dismiss_mediation/2 |
  | POST /intelligence/mediation/:id/create_plan | consensus lock-in prefill |
  | GET  /intelligence/briefings?current=1 | WeeklyBriefing |
  | GET  /intelligence/briefings | past list |
  | GET  /intelligence/briefings/:id | full briefing |
  | POST /intelligence/briefings/:id/dismiss | dismiss-for-week |

  No new intelligence behavior — read/write adapters only.
  """

  import Ecto.Query

  require Logger

  alias OpalCore.Accounts.User
  alias OpalCore.Events.Publisher
  alias OpalCore.Intelligence.{BroadcastChoreography, GroupDecision, GroupCoordinator}
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.{
    GroupDecisionState,
    OutcomeSignal,
    PersonMemory,
    PlanMemory,
    RelationshipBehaviorProfile,
    Routine,
    TemporalAnchor,
    WeeklyBriefing
  }

  # ── Person memory ──────────────────────────────────────────────────────────

  def get_person_memory(account_id, person_id)
      when is_binary(account_id) and is_binary(person_id) do
    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      nil ->
        {:error, :not_found}

      %PersonMemory{} = pm ->
        {:ok, build_person_memory_view(account_id, pm)}
    end
  end

  def get_person_memory(_, _), do: {:error, :not_found}

  def patch_fact(account_id, person_id, key, value, opts \\ [])
      when is_binary(account_id) and is_binary(person_id) and is_binary(key) and is_binary(value) do
    source_note = Keyword.get(opts, :source_note, "corrected by owner")

    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      nil ->
        {:error, :not_found}

      %PersonMemory{} = pm ->
        facts = pm.known_facts || %{}
        old = facts[key] || facts[String.to_atom(key)]

        entry = %{
          "value" => value,
          "provenance" => "stated",
          "confidence" => 0.9,
          "needs_revalidation" => false,
          "source_note" => source_note,
          "corrected_at" => DateTime.to_iso8601(DateTime.utc_now())
        }

        Logger.info(
          "product_surface.fact_corrected account=#{account_id} person=#{person_id} key=#{key} old=#{inspect(old)} new=#{value}"
        )

        facts = Map.put(normalize_facts_map(facts), key, entry)

        case pm |> PersonMemory.changeset(%{known_facts: facts}) |> Repo.update() do
          {:ok, _} -> {:ok, fact_contract(key, entry)}
          {:error, cs} -> {:error, cs}
        end
    end
  end

  def delete_fact(account_id, person_id, key, confirm)
      when is_binary(account_id) and is_binary(person_id) and is_binary(key) do
    if confirm != true and confirm != "true" do
      {:error, :confirm_required}
    else
      case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
        nil ->
          {:error, :not_found}

        %PersonMemory{} = pm ->
          facts = normalize_facts_map(pm.known_facts || %{})

          case Map.get(facts, key) do
            nil ->
              {:error, :not_found}

            entry when is_map(entry) ->
              archived =
                entry
                |> Map.put("archived_at", DateTime.to_iso8601(DateTime.utc_now()))
                |> Map.put("archived", true)

              facts = Map.put(facts, key, archived)

              case pm |> PersonMemory.changeset(%{known_facts: facts}) |> Repo.update() do
                {:ok, _} -> {:ok, %{deleted: true, archived: true}}
                {:error, cs} -> {:error, cs}
              end

            _ ->
              facts = Map.delete(facts, key)

              case pm |> PersonMemory.changeset(%{known_facts: facts}) |> Repo.update() do
                {:ok, _} -> {:ok, %{deleted: true}}
                {:error, cs} -> {:error, cs}
              end
          end
      end
    end
  end

  def confirm_fact(account_id, person_id, key, action)
      when is_binary(account_id) and is_binary(person_id) and is_binary(key) do
    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      nil ->
        {:error, :not_found}

      %PersonMemory{} = pm ->
        facts = normalize_facts_map(pm.known_facts || %{})

        case Map.get(facts, key) do
          nil ->
            {:error, :not_found}

          entry when is_map(entry) ->
            next =
              case to_string(action) do
                "confirm" ->
                  entry
                  |> Map.put("provenance", "stated")
                  |> Map.put("confidence", 0.9)
                  |> Map.put("needs_revalidation", false)
                  |> Map.put("needs_confirmation", false)

                "wrong" ->
                  entry
                  |> Map.put("archived_at", DateTime.to_iso8601(DateTime.utc_now()))
                  |> Map.put("archived", true)

                _ ->
                  :bad_action
              end

            if next == :bad_action do
              {:error, :invalid_action}
            else
              facts = Map.put(facts, key, next)

              case pm |> PersonMemory.changeset(%{known_facts: facts}) |> Repo.update() do
                {:ok, _} -> {:ok, fact_contract(key, next)}
                {:error, cs} -> {:error, cs}
              end
            end
        end
    end
  end

  defp build_person_memory_view(account_id, %PersonMemory{} = pm) do
    display = person_display_name(pm.person_id)
    vibe = vibe_summary(pm)

    facts =
      (pm.known_facts || %{})
      |> normalize_facts_map()
      |> Enum.reject(fn {_k, v} -> archived_fact?(v) end)
      |> Enum.map(fn {k, v} -> fact_contract(k, v) end)

    rhythms =
      from(r in Routine,
        where:
          r.account_id == ^account_id and r.person_id == ^pm.person_id and
            (is_nil(r.archived) or r.archived == false),
        order_by: [desc: r.confidence]
      )
      |> Repo.all()
      |> Enum.map(fn r ->
        %{
          "label" => rhythm_label(r),
          "streak_weeks" => max(r.detection_count || 0, 0),
          "provenance" => r.provenance || "observed",
          "evidence_count" => r.detection_count || 0
        }
      end)

    dates =
      from(a in TemporalAnchor,
        where: a.account_id == ^account_id and a.person_id == ^pm.person_id,
        order_by: [asc: a.date]
      )
      |> Repo.all()
      |> Enum.map(fn a ->
        %{
          "anchor_id" => a.id,
          "anchor_type" => a.anchor_type,
          "date" => Date.to_iso8601(a.date),
          "lifecycle" => anchor_lifecycle(a)
        }
      end)

    loops =
      (pm.open_loops || [])
      |> Enum.map(fn loop ->
        %{
          "id" => loop["id"] || loop[:id] || Ecto.UUID.generate(),
          "summary" => loop["summary"] || loop["text"] || loop[:summary] || "Open loop",
          "conversation_id" => loop["conversation_id"] || loop[:conversation_id]
        }
      end)

    learned =
      from(o in OutcomeSignal,
        where: o.account_id == ^account_id and o.archived == false,
        order_by: [desc: o.recorded_at],
        limit: 20
      )
      |> Repo.all()
      |> Enum.filter(fn o ->
        ctx = o.context || %{}
        ctx["person_id"] == pm.person_id or o.ref_id == pm.person_id
      end)
      |> Enum.take(5)
      |> Enum.map(fn o ->
        %{
          "summary" => learned_summary(o),
          "evidence_count" => (o.context || %{})["evidence_count"] || 1,
          "provenance" => (o.context || %{})["provenance"] || "observed"
        }
      end)

    %{
      "person_id" => pm.person_id,
      "display_name" => display,
      "relationship_type" => pm.relationship_type,
      "vibe_summary" => vibe,
      "known_facts" => facts,
      "rhythms" => rhythms,
      "important_dates" => dates,
      "open_loops" => loops,
      "learned_preferences" => learned
    }
  end

  defp fact_contract(key, entry) when is_map(entry) do
    %{
      "key" => to_string(key),
      "value" => entry["value"] || entry[:value] || to_string(entry),
      "source_note" => entry["source_note"] || entry[:source_note],
      "provenance" => entry["provenance"] || entry[:provenance] || "observed",
      "confidence" => entry["confidence"] || entry[:confidence],
      "needs_revalidation" =>
        entry["needs_revalidation"] == true or entry[:needs_revalidation] == true
    }
  end

  defp fact_contract(key, other) do
    %{
      "key" => to_string(key),
      "value" => to_string(other),
      "provenance" => "observed",
      "confidence" => 0.5,
      "needs_revalidation" => false
    }
  end

  defp normalize_facts_map(map) when is_map(map) do
    Map.new(map, fn {k, v} -> {to_string(k), v} end)
  end

  defp archived_fact?(v) when is_map(v),
    do: v["archived"] == true or is_binary(v["archived_at"])

  defp archived_fact?(_), do: false

  defp person_display_name(person_id) do
    case Repo.get(User, person_id) do
      %User{display_name: n} when is_binary(n) and n != "" -> n
      %User{handle: h} when is_binary(h) -> h
      _ -> "Person"
    end
  end

  defp vibe_summary(%PersonMemory{relationship_type: rel} = pm) when is_binary(rel) do
    profile =
      from(p in RelationshipBehaviorProfile, where: p.relationship_type == ^rel, limit: 1)
      |> Repo.one()

    tone =
      cond do
        is_map(pm.behavior_override) and is_binary(pm.behavior_override["tone"]) ->
          pm.behavior_override["tone"]

        match?(%RelationshipBehaviorProfile{}, profile) ->
          profile.tone || "warm"

        true ->
          "warm"
      end

    label = String.replace(rel, "_", " ")
    "#{String.capitalize(label)} · #{tone}"
  end

  defp vibe_summary(_), do: nil

  defp rhythm_label(%Routine{} = r) do
    day =
      case r.day_of_week do
        0 -> "Sunday"
        1 -> "Monday"
        2 -> "Tuesday"
        3 -> "Wednesday"
        4 -> "Thursday"
        5 -> "Friday"
        6 -> "Saturday"
        _ -> nil
      end

    base = r.activity || "routine"
    if day, do: "#{String.capitalize(base)} every #{day}", else: String.capitalize(base)
  end

  defp anchor_lifecycle(%TemporalAnchor{date: date}) do
    today = Date.utc_today()
    diff = Date.diff(date, today)

    cond do
      diff == 0 -> "day_of"
      diff == -1 -> "passed_unplanned"
      diff < -1 -> "passed_unplanned"
      true -> "upcoming"
    end
  end

  defp learned_summary(%OutcomeSignal{outcome: o, signal_type: t, context: ctx}) do
    ctx = ctx || %{}

    cond do
      is_binary(ctx["summary"]) -> ctx["summary"]
      o == "negative" -> "Avoiding similar to prior #{t}"
      o == "positive" -> "Liked prior #{t}"
      true -> "Learned from #{t}"
    end
  end

  # ── Mediation ──────────────────────────────────────────────────────────────

  def list_mediation(account_id) when is_binary(account_id) do
    from(g in GroupDecisionState,
      where: g.account_id == ^account_id and g.consensus_status in ["blocked", "reached"],
      order_by: [desc: g.last_activity_at]
    )
    |> Repo.all()
    |> Enum.map(&mediation_item/1)
    |> then(&{:ok, &1})
  end

  def get_mediation(account_id, id) when is_binary(account_id) and is_binary(id) do
    case Repo.get(GroupDecisionState, id) do
      %GroupDecisionState{account_id: ^account_id} = s -> {:ok, mediation_item(s)}
      %GroupDecisionState{} -> {:error, :not_found}
      nil -> {:error, :not_found}
    end
  end

  def get_mediation_by_conversation(account_id, conversation_id)
      when is_binary(account_id) and is_binary(conversation_id) do
    case Repo.get_by(GroupDecisionState,
           account_id: account_id,
           conversation_id: conversation_id
         ) do
      nil -> {:error, :not_found}
      %GroupDecisionState{} = s -> {:ok, mediation_item(s)}
    end
  end

  def send_mediation(account_id, id, edited_draft \\ nil)
      when is_binary(account_id) and is_binary(id) do
    case Repo.get(GroupDecisionState, id) do
      %GroupDecisionState{account_id: ^account_id} = state ->
        draft =
          edited_draft ||
            get_in(state.mediation_meta || %{}, ["draft"]) ||
            case GroupDecision.mediate(state) do
              {:ok, d} -> d
              _ -> "Let's pick a fair way through."
            end

        meta =
          (state.mediation_meta || %{})
          |> Map.put("draft", draft)
          |> Map.put("card_state", "sent")
          |> Map.put("sent_at", DateTime.to_iso8601(DateTime.utc_now()))

        Repo.transaction(fn ->
          {:ok, updated} =
            state
            |> GroupDecisionState.changeset(%{mediation_meta: meta})
            |> Repo.update()

          {:ok, _outbox} =
            Publisher.record(%{
              event_type: "intelligence.mediation.sent",
              aggregate_type: "group_decision_state",
              aggregate_id: updated.id,
              partition_key: account_id,
              topic_family: "opal.action.events",
              privacy_class: "private_authorized",
              purpose: "mediation_owner_draft",
              payload: %{
                "account_id" => account_id,
                "conversation_id" => updated.conversation_id,
                "decision_id" => updated.id,
                "delivered_via" => "owner_draft"
              }
            })

          # Re-deliver draft to owner Center (owner sends — never Opal group post)
          _ = GroupCoordinator.maybe_mediate_to_owner(updated)

          BroadcastChoreography.broadcast_named(
            "intelligence:group_blocked",
            account_id,
            %{
              "decision_id" => updated.id,
              "conversation_id" => updated.conversation_id,
              "topic" => updated.topic,
              "card_state" => "sent",
              "summary" => draft
            }
          )

          %{delivered_via: :owner_draft, item: mediation_item(updated)}
        end)

      %GroupDecisionState{} ->
        {:error, :not_found}

      nil ->
        {:error, :not_found}
    end
  end

  def dismiss_mediation(account_id, id) when is_binary(account_id) and is_binary(id) do
    case GroupDecision.dismiss_mediation(account_id, id) do
      {:ok, state} ->
        meta =
          (state.mediation_meta || %{})
          |> Map.put("card_state", "dismissed")

        {:ok, updated} =
          state
          |> GroupDecisionState.changeset(%{mediation_meta: meta})
          |> Repo.update()

        {:ok, _outbox} =
          Publisher.record(%{
            event_type: "intelligence.mediation.dismissed",
            aggregate_type: "group_decision_state",
            aggregate_id: updated.id,
            partition_key: account_id,
            topic_family: "opal.action.events",
            privacy_class: "private_authorized",
            purpose: "mediation_dismiss",
            payload: %{"account_id" => account_id, "decision_id" => updated.id}
          })

        {:ok, mediation_item(updated)}

      other ->
        other
    end
  end

  def lock_in_plan(account_id, id) when is_binary(account_id) and is_binary(id) do
    case Repo.get(GroupDecisionState, id) do
      %GroupDecisionState{account_id: ^account_id, consensus_status: "reached"} = state ->
        winner = winning_proposal(state)

        payload = %{
          "decision_id" => state.id,
          "conversation_id" => state.conversation_id,
          "topic" => state.topic,
          "winning_proposal" => winner,
          "plan_prefill" => %{
            "title" => winner || state.topic,
            "conversation_id" => state.conversation_id,
            "what" => winner || state.topic
          }
        }

        BroadcastChoreography.broadcast_named(
          "intelligence:group_consensus",
          account_id,
          Map.put(payload, "summary", "#{winner} won — lock it in?")
        )

        {:ok, payload}

      %GroupDecisionState{account_id: ^account_id} ->
        {:error, :not_reached}

      _ ->
        {:error, :not_found}
    end
  end

  @doc """
  Create a tentative SharedPlan from mediation consensus (or explicit prefill).
  Opal never posts into the group — owner lock-in only.
  """
  def create_plan_from_mediation(account_id, id, params)
      when is_binary(account_id) and is_binary(id) and is_map(params) do
    case Repo.get(GroupDecisionState, id) do
      %GroupDecisionState{account_id: ^account_id} = state ->
        winner = winning_proposal(state)
        title = params["title"] || params["place"] || params["what"] || winner || state.topic

        plan_params = %{
          "title" => title,
          "place" => params["place"] || title,
          "notes" => params["notes"] || get_in(state.mediation_meta || %{}, ["draft"])
        }

        case OpalCore.SocialFlow.create_tentative_plan_from_conversation(
               state.conversation_id,
               account_id,
               plan_params
             ) do
          {:ok, plan, participants} ->
            _ =
              Publisher.record(%{
                event_type: "intelligence.mediation.plan_created",
                aggregate_type: "group_decision_state",
                aggregate_id: state.id,
                partition_key: account_id,
                topic_family: "opal.action.events",
                privacy_class: "account_private",
                purpose: "mediation_lock_in",
                payload: %{
                  "account_id" => account_id,
                  "decision_id" => state.id,
                  "plan_id" => plan.id,
                  "conversation_id" => state.conversation_id
                }
              })

            BroadcastChoreography.broadcast_named(
              "intelligence:group_consensus",
              account_id,
              %{
                "decision_id" => state.id,
                "conversation_id" => state.conversation_id,
                "plan_id" => plan.id,
                "summary" => "Locked in #{title}"
              }
            )

            {:ok,
             %{
               "created" => true,
               "plan" => OpalCore.SocialFlow.SharedPlan.to_contract(plan),
               "participants" => length(participants),
               "mediation_id" => state.id
             }}

          {:error, reason} ->
            {:error, reason}
        end

      _ ->
        {:error, :not_found}
    end
  end

  defp mediation_item(%GroupDecisionState{} = s) do
    meta = s.mediation_meta || %{}
    draft = meta["draft"]

    draft =
      if is_binary(draft) and draft != "" do
        draft
      else
        case GroupDecision.mediate(s) do
          {:ok, d} -> d
          _ -> nil
        end
      end

    positions =
      Enum.map(s.proposals || [], fn p ->
        supporters =
          (p["supporters"] || [])
          |> Enum.map(&person_display_name/1)

        %{
          "proposal" => p["proposal_text"] || p["option"] || "option",
          "supporters" => supporters
        }
      end)

    silent =
      (s.silent_participants || [])
      |> Enum.map(&person_display_name/1)

    card_state =
      cond do
        meta["card_state"] -> meta["card_state"]
        match?(%DateTime{}, s.mediation_dismissed_until) and
            DateTime.compare(s.mediation_dismissed_until, DateTime.utc_now()) == :gt ->
          "dismissed"

        true ->
          "pending"
      end

    %{
      "id" => s.id,
      "status" => s.consensus_status,
      "topic" => s.topic,
      "conversation_id" => s.conversation_id,
      "positions" => positions,
      "silent_participants" => silent,
      "mediation_draft" => draft || "",
      "card_state" => card_state
    }
  end

  defp winning_proposal(%GroupDecisionState{proposals: props}) do
    (props || [])
    |> Enum.max_by(fn p -> length(p["supporters"] || []) end, fn -> nil end)
    |> case do
      nil -> nil
      p -> p["proposal_text"] || p["option"]
    end
  end

  # ── Briefings ──────────────────────────────────────────────────────────────

  def current_briefing(account_id) when is_binary(account_id) do
    week_start = Date.beginning_of_week(Date.utc_today(), :monday)

    case Repo.get_by(WeeklyBriefing, account_id: account_id, week_start: week_start) do
      nil ->
        next = next_sunday_6pm()
        {:error, :not_found, %{"next_briefing_at" => DateTime.to_iso8601(next)}}

      %WeeklyBriefing{dismissed_at: %DateTime{}} = b ->
        # dismissed for week — still returnable as past; current returns 404+next
        next = DateTime.add(DateTime.utc_now(), 7 * 86_400, :second)
        {:error, :dismissed, %{"next_briefing_at" => DateTime.to_iso8601(next), "id" => b.id}}

      %WeeklyBriefing{} = b ->
        {:ok, briefing_contract(b)}
    end
  end

  def list_past_briefings(account_id, opts \\ []) when is_binary(account_id) do
    limit = Keyword.get(opts, :limit, 12)
    week_start = Date.beginning_of_week(Date.utc_today(), :monday)

    rows =
      from(b in WeeklyBriefing,
        where: b.account_id == ^account_id and b.week_start < ^week_start,
        order_by: [desc: b.week_start],
        limit: ^limit
      )
      |> Repo.all()

    {:ok, Enum.map(rows, &briefing_summary/1)}
  end

  def get_briefing(account_id, id) when is_binary(account_id) and is_binary(id) do
    case Repo.get(WeeklyBriefing, id) do
      %WeeklyBriefing{account_id: ^account_id} = b -> {:ok, briefing_contract(b)}
      _ -> {:error, :not_found}
    end
  end

  def dismiss_briefing(account_id, id) when is_binary(account_id) and is_binary(id) do
    case Repo.get(WeeklyBriefing, id) do
      %WeeklyBriefing{account_id: ^account_id} = b ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        case b
             |> WeeklyBriefing.changeset(%{dismissed_at: now})
             |> Repo.update() do
          {:ok, updated} ->
            {:ok, _outbox} =
              Publisher.record(%{
                event_type: "intelligence.briefing.dismissed",
                aggregate_type: "weekly_briefing",
                aggregate_id: updated.id,
                partition_key: account_id,
                topic_family: "opal.action.events",
                privacy_class: "private_authorized",
                purpose: "briefing_dismiss",
                payload: %{"account_id" => account_id, "briefing_id" => updated.id}
              })

            {:ok, briefing_contract(updated)}

          {:error, cs} ->
            {:error, cs}
        end

      _ ->
        {:error, :not_found}
    end
  end

  defp briefing_contract(%WeeklyBriefing{} = b) do
    structured = b.structured || %{}
    week_end = Date.add(b.week_start, 6)

    base = %{
      "id" => b.id,
      "week_start" => Date.to_iso8601(b.week_start),
      "week_end" => Date.to_iso8601(week_end),
      "header" => structured["header"] || "Your week ahead",
      "confirmed" => structured["confirmed"] || [],
      "still_open" => structured["still_open"] || [],
      "tight_spots" => structured["tight_spots"] || [],
      "suggestion" => structured["suggestion"],
      "question" => structured["question"]
    }

    parsed = parse_briefing_content(b)

    base
    |> then(fn m ->
      if m["confirmed"] == [], do: Map.put(m, "confirmed", parsed["confirmed"] || []), else: m
    end)
    |> then(fn m ->
      if m["still_open"] == [], do: Map.put(m, "still_open", parsed["still_open"] || []), else: m
    end)
    |> then(fn m ->
      if is_nil(m["suggestion"]), do: Map.put(m, "suggestion", parsed["suggestion"]), else: m
    end)
    |> then(fn m ->
      if is_nil(m["question"]), do: Map.put(m, "question", parsed["question"]), else: m
    end)
  end

  defp briefing_summary(%WeeklyBriefing{} = b) do
    week_end = Date.add(b.week_start, 6)
    structured = b.structured || %{}

    %{
      "id" => b.id,
      "week_start" => Date.to_iso8601(b.week_start),
      "week_end" => Date.to_iso8601(week_end),
      "header" => structured["header"] || "Week of #{Date.to_iso8601(b.week_start)}",
      # Past list: real truncated sections from stored structured (not empty stubs).
      "confirmed" => Enum.take(structured["confirmed"] || [], 3),
      "still_open" => Enum.take(structured["still_open"] || [], 3),
      "tight_spots" => Enum.take(structured["tight_spots"] || [], 3)
    }
  end

  defp parse_briefing_content(%WeeklyBriefing{content: content}) when is_binary(content) do
    lines =
      content
      |> String.split("\n")
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(&1 == ""))

    confirmed =
      lines
      |> Enum.filter(&String.contains?(&1, ["Confirmed", "✓", "locked"]))
      |> Enum.map(&%{"label" => &1})

    open =
      lines
      |> Enum.filter(&String.contains?(&1, ["open", "unconfirmed", "Still"]))
      |> Enum.map(&%{"label" => &1, "link" => %{"kind" => "conversation"}})

    question_line = Enum.find(lines, &String.contains?(&1, "?"))

    %{
      "confirmed" => confirmed,
      "still_open" => open,
      "tight_spots" => [],
      "suggestion" =>
        if(length(lines) > 0, do: %{"label" => List.last(lines)}, else: nil),
      "question" =>
        if question_line do
          %{
            "label" => question_line,
            "link" => %{"kind" => "plan_create", "prefill" => question_line}
          }
        end
    }
  end

  defp parse_briefing_content(_),
    do: %{"confirmed" => [], "still_open" => [], "tight_spots" => []}

  defp next_sunday_6pm do
    today = Date.utc_today()
    days = rem(7 - Date.day_of_week(today, :monday) + 6, 7)
    days = if days == 0 and Date.day_of_week(today, :monday) != 7, do: 7, else: days
    sunday = Date.add(today, if(Date.day_of_week(today, :monday) == 7, do: 0, else: days))
    {:ok, dt} = DateTime.new(sunday, ~T[18:00:00], "Etc/UTC")
    dt
  end

  # ── Attention enrichment helpers (used by AttentionCenterItem.to_contract) ─

  def enrich_attention_metadata(meta, item) when is_map(meta) do
    source = item.source_type || meta["source_type"]

    if source in ~w(temporal_anchor celebration reminder commitment_reminder) do
      person_id = meta["person_id"]
      anchor_id = meta["anchor_id"] || meta["source_id"]

      anchor =
        cond do
          is_binary(anchor_id) -> Repo.get(TemporalAnchor, anchor_id)
          is_binary(person_id) ->
            from(a in TemporalAnchor,
              where: a.account_id == ^item.owner_user_id and a.person_id == ^person_id,
              order_by: [asc: a.date],
              limit: 1
            )
            |> Repo.one()

          true ->
            nil
        end

      plan =
        if is_binary(item.plan_id) do
          Repo.get(PlanMemory, item.plan_id) ||
            Repo.get_by(PlanMemory, plan_id: item.plan_id, account_id: item.owner_user_id)
        end

      lifecycle =
        cond do
          match?(%PlanMemory{}, plan) -> "planned"
          match?(%TemporalAnchor{}, anchor) -> anchor_lifecycle(anchor)
          true -> meta["lifecycle"] || "upcoming"
        end

      days_until =
        case anchor do
          %TemporalAnchor{date: d} -> Date.diff(d, Date.utc_today())
          _ -> meta["days_until"]
        end

      meta
      |> Map.put("lifecycle", lifecycle)
      |> Map.put("person_id", person_id || (anchor && anchor.person_id))
      |> Map.put(
        "person_name",
        meta["person_name"] ||
          (person_id && person_display_name(person_id)) ||
          (anchor && person_display_name(anchor.person_id))
      )
      |> Map.put("anchor_type", meta["anchor_type"] || (anchor && anchor.anchor_type))
      |> Map.put(
        "anchor_date",
        meta["anchor_date"] || (anchor && Date.to_iso8601(anchor.date))
      )
      |> Map.put("days_until", days_until)
      |> Map.put("plan_status", if(match?(%PlanMemory{}, plan), do: "planned", else: "none"))
      |> Map.put("plan_id", item.plan_id || (plan && plan.plan_id))
      |> Map.put(
        "plan_summary",
        meta["plan_summary"] || (plan && (plan.plan_label || plan.time_label))
      )
    else
      meta
      |> Map.put_new("lifecycle", item.status || "active")
    end
  end

  def enrich_attention_metadata(meta, _), do: meta || %{}
end
