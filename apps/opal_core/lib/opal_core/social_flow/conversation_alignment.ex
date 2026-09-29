defmodule OpalCore.SocialFlow.ConversationAlignment do
  @moduledoc """
  Folds real conversation messages into one SharedPlan.

  Dimensions move UNKNOWN → CANDIDATE → CONSTRAINED → AGREED → LOCKED.
  A later contradiction reopens only the field it changes.
  Button taps are explicit actions on that same plan. They replay with
  messages, so a later refetch cannot drop a confirmation.
  """

  import Ecto.Query

  alias OpalCore.Events.Publisher
  alias OpalCore.Messages
  alias OpalCore.Messaging.Message
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{ActivityIntent, CandidateProvider, DateTimeChange, SeedFixtureLeak, SharedPlan, SmokeResidue}

  @activities ["coffee", "dinner", "drinks", "something active", "somewhere quiet"]
  @schema_version 1

  def consequential?(body) when is_binary(body) do
    text = normalize(body)
    text != "" and not trivial?(text) and not SeedFixtureLeak.seed_fixture_body?(body) and
      Regex.match?(
        ~r/tomorrow|\bmeet\b|after\s+\d|let'?s do|lets do|make it\s+\d|\bwhere\b|\bconfirm\b/,
        text
      )
  end

  def consequential?(_), do: false

  def fold(messages, member_ids, actions \\ [])
      when is_list(messages) and is_list(member_ids) and is_list(actions) do
    base = %{
      "schema_version" => @schema_version,
      "plan_timezone" => DateTimeChange.timezone(),
      "plan_version" => 0,
      "participants" => field("locked", member_ids, nil),
      "activity" => field("unknown", nil, nil),
      "date" => field("unknown", nil, nil),
      "time_window" => field("unknown", nil, nil),
      "exact_time" => field("unknown", nil, nil),
      "place" => field("unknown", nil, nil),
      "execution" => field("unknown", nil, nil),
      "prompt" => nil,
      "completion" => nil,
      "next" => nil,
      "confirmable" => false
    }

    message_events =
      messages
      |> Enum.with_index(1)
      |> Enum.map(fn {message, index} ->
        %{at: event_at(message, index), order: index, kind: :message, message: message}
      end)

    action_events =
      actions
      |> Enum.with_index(1)
      |> Enum.map(fn {action, index} ->
        %{at: event_at(action, index), order: index, kind: :action, action: action}
      end)

    (message_events ++ action_events)
    |> Enum.sort_by(&{&1.at, &1.order, if(&1.kind == :message, do: 0, else: 1)})
    |> Enum.reduce(base, fn
      %{kind: :message, message: message}, acc -> apply_message(acc, message)
      %{kind: :action, action: action}, acc -> apply_action(acc, action)
    end)
    |> Map.put("explicit_actions", actions)
    |> present()
  end

  def sync_conversation(conversation_id) when is_binary(conversation_id) do
    {:ok, state} = Repo.transaction(fn -> sync_locked(conversation_id) end)
    state
  end

  @doc """
  Replay one final call utterance through the same fold as a chat message.
  The spoken text is not inserted as a chat message.
  """
  def record_voice_utterance(conversation_id, attrs) when is_binary(conversation_id) and is_map(attrs) do
    action = %{
      "kind" => "voice_utterance",
      "actor_user_id" => attrs["speaker_user_id"],
      "value" => attrs["source_segment_id"],
      "utterance" => attrs["text"],
      "normalized" => attrs["normalized"] || attrs["text"],
      "source_type" => "call_transcript",
      "source_call_id" => attrs["call_id"],
      "source_segment_id" => attrs["source_segment_id"],
      "confidence" => attrs["confidence"],
      "truth" => "proposed",
      "explicit" => true,
      "schema_version" => @schema_version,
      "at" => DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()
    }

    saved =
      Repo.transaction(fn ->
        case lock_plan(conversation_id) do
          nil ->
            Repo.rollback(:no_plan)

          %SharedPlan{} = plan ->
            actions = actions_from_plan(plan)

            if Enum.any?(actions, &(&1["source_segment_id"] == action["source_segment_id"])) do
              :duplicate
            else
              alignment = plan.alignment || %{}
              updated = Map.put(alignment, "explicit_actions", actions ++ [action])

              case plan |> SharedPlan.changeset(%{alignment: updated}) |> Repo.update() do
                {:ok, _} -> :recorded
                {:error, _} -> Repo.rollback(:persist_failed)
              end
            end
        end
      end)

    case saved do
      {:ok, :duplicate} ->
        {:ok, sync_conversation(conversation_id)}

      {:ok, :recorded} ->
        state = sync_conversation(conversation_id)
        deliver_alignment(conversation_id, state)
        {:ok, state}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp deliver_alignment(conversation_id, state) when is_map(state) do
    OpalCoreWeb.Endpoint.broadcast("conversation:#{conversation_id}", "alignment:updated", %{
      "conversation_id" => conversation_id,
      "plan_id" => state["lineage_id"],
      "plan_version" => state["plan_version"],
      "proposal_id" => get_in(state, ["change_proposal", "proposal_id"]),
      "schema_version" => 1
    })

    OpalCore.Messaging.Inbox.fanout_plan(conversation_id, state)
  rescue
    _ -> :ok
  end

  defp sync_locked(conversation_id) do
    plan = lock_plan(conversation_id)

    messages =
      from(m in Message,
        where: m.conversation_id == ^conversation_id,
        order_by: [asc: m.server_seq]
      )
      |> Repo.all()
      |> Enum.reject(&(SmokeResidue.smoke_body?(&1.body) or SeedFixtureLeak.seed_fixture_body?(&1.body)))

    members = Messages.member_user_ids(conversation_id)
    actions = actions_from_plan(plan)
    state =
      fold(messages, members, actions)
      |> freeze_plan_set_event(plan && plan.alignment)

    if plan_material?(state) do
      _ = upsert_plan(conversation_id, state, List.first(members))
    end

    state
  end

  @doc """
  The first committed summary stays put. Later edits update the live plan only.
  """
  def freeze_plan_set_event(state, previous) when is_map(state) do
    existing = previous && previous["plan_set_event"]

    cond do
      is_map(existing) and is_binary(existing["summary"]) and existing["summary"] != "" ->
        Map.put(state, "plan_set_event", existing)

      state["commitment"] in ["aligned", "execution_ready"] and is_list(state["plan_lines"]) and
          state["plan_lines"] != [] ->
        Map.put(state, "plan_set_event", %{
          "summary" => Enum.join(state["plan_lines"], " · "),
          "at" => DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601()
        })

      true ->
        state
    end
  end

  def freeze_plan_set_event(state, _), do: state

  defp lock_plan(conversation_id) do
    from(p in SharedPlan, where: p.conversation_id == ^conversation_id, lock: "FOR UPDATE")
    |> Repo.one()
  end

  def set_activity(conversation_id, user_id, activity) when is_binary(activity) do
    with :ok <- member?(conversation_id, user_id) do
      value = activity |> String.downcase() |> String.trim()

      if value in @activities do
        _ = sync_conversation(conversation_id)

        with :ok <- append_action(conversation_id, action("activity_lock", user_id, value, "user_stated")) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :unknown_activity}
      end
    end
  end

  def confirm_exact_time(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)
      exact = state["exact_time"] || %{}

      if exact["state"] in ["candidate", "constrained", "agreed"] and is_binary(exact["value"]) do
        with :ok <- append_action(conversation_id, action("exact_time_lock", user_id, exact["value"], "locked")) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :nothing_to_confirm}
      end
    end
  end

  def nominate_place(conversation_id, user_id, name) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id),
         {:ok, canonical} <- canonical_place(name) do
      state = sync_conversation(conversation_id)

      offered =
        CandidateProvider.recommend(
          get_in(state, ["activity", "value"]) || "",
          get_in(state, ["participants", "value"]) || [],
          state,
          %{}
        )

      cond do
        field_state(state, "place") == "locked" ->
          {:error, :place_locked}

        not Enum.any?(offered, &(&1["name"] == canonical)) ->
          {:error, :activity_not_ready}

        true ->
          with :ok <- append_action(conversation_id, action("place_propose", user_id, canonical, "proposed")) do
            {:ok, sync_conversation(conversation_id)}
          end
      end
    end
  end

  def confirm_place(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)
      proposed_by = get_in(state, ["place", "proposed_by_user_id"])
      value = get_in(state, ["place", "value"])

      cond do
        field_state(state, "place") != "candidate" or not is_binary(value) ->
          {:error, :nothing_to_confirm}

        proposed_by == user_id ->
          {:error, :cannot_confirm_own_proposal}

        true ->
          with :ok <- append_action(conversation_id, action("place_confirm", user_id, value, "agreed")) do
            {:ok, sync_conversation(conversation_id)}
          end
      end
    end
  end

  def decline_place(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      if field_state(state, "place") in ["candidate", "conflicted"] do
        value = get_in(state, ["place", "value"])

        with :ok <- append_action(conversation_id, action("place_decline", user_id, value, "revoked")) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :nothing_to_decline}
      end
    end
  end

  def reopen_place(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      if field_state(state, "place") == "locked" do
        value = get_in(state, ["place", "value"])

        with :ok <- append_action(conversation_id, action("place_reopen", user_id, value, "revoked")) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :place_not_locked}
      end
    end
  end

  def propose_datetime_phrase(conversation_id, user_id, text) when is_binary(text) do
    propose_datetime_phrase(conversation_id, user_id, %{"text" => text})
  end

  def propose_datetime_phrase(conversation_id, user_id, attrs) when is_map(attrs) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      case canonical_datetime_change(state, attrs) do
        {:ok, change} ->
          proposal_id = Ecto.UUID.generate()

          stored =
            action("change_propose", user_id, change["summary"], "proposed")
            |> Map.merge(%{
              "field" => "datetime",
              "proposal_id" => proposal_id,
              "resolved_on" => change["resolved_on"],
              "local_time" => change["local_time"],
              "timezone" => change["timezone"] || DateTimeChange.timezone(),
              "date" => change["date"],
              "exact_time" => change["exact_time"],
              "time_window" => change["time_window"],
              "base_plan_version" => state["plan_version"] || 0
            })

          with :ok <- append_action(conversation_id, stored) do
            state = sync_conversation(conversation_id)
            maybe_record_chat_proposal(conversation_id, state)
            {:ok, state}
          end

        {:clarify, prompt} ->
          {:error, {:clarify, prompt}}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  defp canonical_datetime_change(_state, %{"date" => date, "time" => time} = attrs)
       when is_binary(date) and is_binary(time) and date != "" and time != "" do
    DateTimeChange.from_controls(attrs)
  end

  defp canonical_datetime_change(state, %{"text" => text}) when is_binary(text) do
    context = %{
      "exact_time" => get_in(state, ["exact_time", "value"]),
      "date" => get_in(state, ["date", "value"]),
      "reference_on" => "2026-09-27"
    }

    case DateTimeChange.interpret(text, context, scoped: true) do
      {:change, change} -> {:ok, change}
      {:clarify, prompt} -> {:clarify, prompt}
      :keep -> {:error, :nothing_to_confirm}
      :none -> {:clarify, "Say a day, a time, or both."}
    end
  end

  defp canonical_datetime_change(_state, _attrs), do: {:clarify, "Say a day, a time, or both."}

  def propose_committed_change(conversation_id, _user_id, field, value)
      when not is_binary(field) or not is_binary(value) do
    if is_binary(conversation_id), do: {:error, :not_committed}, else: {:error, :not_a_member}
  end

  def propose_committed_change(conversation_id, user_id, field, value)
      when is_binary(conversation_id) and is_binary(field) and is_binary(value) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      if state["commitment"] in ["aligned", "execution_ready"] and field in ["exact_time", "activity", "place"] do
        with :ok <-
               append_action(conversation_id, action("change_propose", user_id, value, "proposed") |> Map.put("field", field)) do
          state = sync_conversation(conversation_id)
          maybe_record_chat_proposal(conversation_id, state)
          {:ok, state}
        end
      else
        {:error, :not_committed}
      end
    end
  end

  def accept_committed_change(conversation_id, user_id, proposal_id \\ nil) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)
      proposal = state["change_proposal"]

      cond do
        not is_map(proposal) ->
          {:error, :nothing_to_confirm}

        is_binary(proposal_id) and proposal["proposal_id"] != proposal_id ->
          {:error, :stale_proposal}

        proposal["status"] in ["stale", "superseded"] ->
          {:error, :stale_proposal}

        is_integer(proposal["base_plan_version"]) and
            proposal["base_plan_version"] != (state["plan_version"] || 0) ->
          {:error, :stale_proposal}

        proposal["proposed_by_user_id"] == user_id ->
          {:error, :cannot_confirm_own_proposal}

        true ->
          with :ok <-
                 append_action(
                   conversation_id,
                   action("change_accept", user_id, proposal["value"], "agreed")
                   |> Map.merge(%{"field" => proposal["field"], "proposal_id" => proposal["proposal_id"]})
                 ) do
            state = sync_conversation(conversation_id)

            OpalCore.Calls.Outcomes.record_acceptance(
              conversation_id,
              proposal
              |> Map.put("accepted_by_user_id", user_id)
              |> Map.put("accepted_plan_version", state["plan_version"])
            )

            deliver_alignment(conversation_id, state)
            {:ok, state}
          end
      end
    end
  end

  def keep_committed_plan(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)
      proposal = state["change_proposal"]

      if is_map(proposal) do
        value = proposal["current"]

        with :ok <- append_action(conversation_id, action("change_keep", user_id, value, "locked")) do
          OpalCore.Calls.Outcomes.record_keep(conversation_id, proposal, user_id)
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :nothing_to_confirm}
      end
    end
  end

  @doc """
  Records that this person authorizes a reservation request.

  Agreement is not execution. This does not contact a restaurant.
  """
  def authorize_reservation(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      if field_state(state, "place") == "locked" do
        value = get_in(state, ["place", "value"])

        with :ok <-
               append_action(conversation_id, action("reservation_authorize", user_id, value, "proposed")) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :place_not_locked}
      end
    end
  end

  def plan_material?(state) do
    ["date", "time_window", "exact_time", "place"]
    |> Enum.any?(fn key -> get_in(state, [key, "state"]) not in [nil, "unknown"] end)
  end

  defp maybe_record_chat_proposal(conversation_id, state) when is_map(state) do
    case state["change_proposal"] do
      proposal when is_map(proposal) ->
        OpalCore.Calls.Outcomes.record_proposal_state(conversation_id, proposal, %{
          "source_type" => proposal["source_type"] || "chat",
          "plan_version" => state["plan_version"],
          "plan_id" => state["lineage_id"]
        })

      _ ->
        :skipped
    end
  end

  defp member?(conversation_id, user_id) do
    if user_id in Messages.member_user_ids(conversation_id), do: :ok, else: {:error, :not_a_member}
  end

  defp apply_message(state, message) do
    body = message_body(message)
    id = message_id(message)
    actor = message_actor(message)
    text = normalize(body)

    cond do
      text == "" or trivial?(text) or SeedFixtureLeak.seed_fixture_body?(body) ->
        state

      true ->
        state
        |> note_activity(text, id)
        |> note_date(text, id)
        |> accept_date(text, id)
        |> note_window(text, id)
        |> note_exact(text, id)
        |> retarget_time(text, id, actor)
        |> note_place(text, id, actor)
        |> accept_place(text, id, actor)
        |> note_datetime_change(text, id, actor)
        |> note_activity_intent(text, id, actor)
    end
  end

  defp note_datetime_change(state, text, id, actor) do
    context = %{
      "exact_time" => get_in(state, ["exact_time", "value"]),
      "date" => get_in(state, ["date", "value"]),
      "reference_on" => "2026-09-27"
    }

    case DateTimeChange.interpret(text, context, scoped: false) do
      :none ->
        state

      :keep ->
        Map.delete(state, "change_proposal")

      {:clarify, prompt} ->
        if committed_plan?(state), do: Map.put(state, "clarify", prompt), else: state

      {:change, change} ->
        apply_datetime_change(state, change, id, actor)
    end
  end

  defp apply_datetime_change(state, change, id, actor) do
    direct? = not committed_plan?(state) or (not DateTimeChange.confirmation_required?(state) and actor == DateTimeChange.holder_id(state))

    if direct? do
      state
      |> put_parsed_date(change, id)
      |> put_parsed_time(change, id)
      |> put_parsed_window(change, id)
    else
      put_change_proposal(state, datetime_proposal(state, change, actor))
    end
  end

  defp committed_plan?(state) do
    field_state(state, "exact_time") == "locked" and field_state(state, "place") == "locked"
  end

  defp datetime_proposal(state, change, actor) do
    %{
      "field" => "datetime",
      "value" => change["summary"],
      "current" => get_in(state, ["exact_time", "value"]),
      "current_date" => get_in(state, ["date", "value"]),
      "date" => change["date"],
      "exact_time" => change["exact_time"],
      "time_window" => change["time_window"],
      "date_constraint" => change["date_constraint"],
      "proposed_by_user_id" => actor,
      "truth" => "proposed",
      "explicit" => true,
      "approximate" => change["approximate"]
    }
  end

  defp put_parsed_date(state, %{"date" => %{"value" => value} = date}, id) when is_binary(value) do
    put_field(state, "date", "candidate", value, id, %{
      "resolved_on" => date["resolved_on"],
      "timezone" => date["timezone"] || DateTimeChange.timezone(),
      "explicit" => true
    })
  end

  defp put_parsed_date(state, _, _), do: state

  defp put_parsed_time(state, %{"exact_time" => %{"state" => "unknown"}}, _id), do: clear_exact(state)

  defp put_parsed_time(state, %{"exact_time" => %{"value" => value, "state" => field_state}}, id)
       when is_binary(value) do
    approximate = field_state == "approximate"
    lock = not approximate and field_state(state, "place") == "locked"

    put_field(state, "exact_time", if(lock, do: "locked", else: "candidate"), value, id, %{
      "needs_confirm" => not lock,
      "confidence" => if(approximate, do: "approximate", else: "explicit"),
      "explicit" => not approximate
    })
  end

  defp put_parsed_time(state, _, _), do: state

  defp put_parsed_window(state, %{"time_window" => %{"value" => value} = window}, id) when is_binary(value) do
    put_field(state, "time_window", "constrained", value, id, %{
      "start" => window["start"],
      "end" => window["end"],
      "explicit" => true
    })
  end

  defp put_parsed_window(state, _, _), do: state

  defp clear_exact(state) do
    put_field(state, "exact_time", "unknown", nil, nil, %{"explicit" => true, "truth" => nil})
  end

  defp note_activity_intent(state, text, id, actor) do
    case ActivityIntent.compile(text) do
      nil ->
        state

      intent ->
        label = intent["normalized_label"]
        current = get_in(state, ["activity", "value"])

        cond do
          current == label ->
            state

          committed_plan?(state) ->
            put_change_proposal(state, %{
              "field" => "activity",
              "value" => label,
              "current" => current,
              "proposed_by_user_id" => actor,
              "truth" => "proposed",
              "explicit" => true,
              "execution_type" => intent["execution_type"],
              "category" => intent["category"]
            })

          field_state(state, "activity") in ["unknown", "candidate"] ->
            put_field(state, "activity", "locked", label, id, %{
              "explicit" => true,
              "truth" => "user_stated",
              "category" => intent["category"],
              "subtype" => intent["subtype"],
              "scope" => intent["scope"],
              "execution_type" => intent["execution_type"],
              "raw_text" => intent["raw_text"]
            })

          true ->
            state
        end
    end
  end

  defp note_activity(state, text, id) do
    if Regex.match?(~r/\bmeet\b|\bmeetup\b/, text) and field_state(state, "activity") == "unknown" do
      put_field(state, "activity", "candidate", "meet", id)
    else
      state
    end
  end

  defp note_date(state, text, id) do
    cond do
      field_state(state, "date") == "locked" ->
        state

      Regex.match?(~r/\btomorrow\b/, text) ->
        put_field(state, "date", "candidate", "tomorrow", id)

      true ->
        state
    end
  end

  defp accept_date(state, text, id) do
    if field_state(state, "date") == "candidate" and Regex.match?(~r/\b(yes|yeah|works|sure|ok)\b/, text) do
      put_field(state, "date", "locked", "tomorrow", id)
    else
      state
    end
  end

  defp note_window(state, text, id) do
    cond do
      field_state(state, "exact_time") == "locked" ->
        state

      Regex.match?(~r/\bafter\s+6(?:\s*pm)?/, text) ->
        put_field(state, "time_window", "constrained", "after 6 PM", id)

      true ->
        state
    end
  end

  defp note_exact(state, text, id) do
    cond do
      field_state(state, "exact_time") == "locked" and not Regex.match?(~r/\bmake it\s+\d/, text) ->
        state

      Regex.match?(~r/\blet'?s do\s+6:30\b|\blets do\s+6:30\b/, text) ->
        propose_exact(state, "6:30 PM", id)

      Regex.match?(~r/\blet'?s do\s+6\b|\blets do\s+6\b/, text) ->
        propose_exact(state, "6:00 PM", id)

      true ->
        state
    end
  end

  defp retarget_time(state, text, id, actor) do
    case Regex.run(~r/\b(?:actually\s+)?make it\s+(\d{1,2})\b/, text) do
      [_, hour] ->
        label = "#{hour}:00 PM"
        previous = get_in(state, ["exact_time", "value"])

        # Committed plans (locked time + place) always propose — same law as
        # apply_datetime_change/4. Execution agreement is not required; a prior
        # time accept may have cleared reservation without unlocking the plan.
        cond do
          committed_plan?(state) and previous != label ->
            put_change_proposal(state, "exact_time", label, actor || id)

          previous == label ->
            state
            |> put_field("exact_time", "candidate", label, id)
            |> put_in(["exact_time", "needs_confirm"], true)

          true ->
            state
            |> put_field("exact_time", "candidate", label, id)
            |> put_in(["exact_time", "needs_confirm"], true)
            |> clear_execution()
        end

      _ ->
        state
    end
  end

  defp note_place(state, text, id, actor) do
    name =
      if Regex.match?(~r/\b(let'?s do|lets do|make it|actually)\b/, text),
        do: canonical_from_text(text),
        else: nil

    cond do
      is_nil(name) ->
        state

      field_state(state, "place") == "locked" and place_retarget?(text) ->
        state
        |> clear_place()
        |> clear_execution()
        |> propose_place(name, id, actor)

      field_state(state, "place") == "locked" ->
        state

      true ->
        propose_place(state, name, id, actor)
    end
  end

  defp accept_place(state, text, id, actor) do
    proposed_by = get_in(state, ["place", "proposed_by_user_id"])

    if field_state(state, "exact_time") == "locked" and field_state(state, "place") == "candidate" and
         is_binary(actor) and actor != proposed_by and
         Regex.match?(~r/\A(yes|yeah|yep|confirm|sure|ok|okay)[!. ]*\z/, text) do
      lock_place(state, get_in(state, ["place", "value"]), id, actor, "confirmed")
    else
      state
    end
  end

  defp apply_action(state, %{"kind" => "change_propose", "field" => "datetime", "proposal_id" => proposal_id} = action)
       when is_binary(proposal_id) do
    previous = state["change_proposal"]

    history =
      case previous do
        %{"proposal_id" => old_id} = prior when old_id != proposal_id ->
          (state["proposal_history"] || []) ++ [Map.put(prior, "status", "superseded")]

        _ ->
          state["proposal_history"] || []
      end

    proposal = %{
      "proposal_id" => proposal_id,
      "field" => "datetime",
      "status" => "pending",
      "value" => action["value"],
      "resolved_on" => action["resolved_on"],
      "local_time" => action["local_time"],
      "timezone" => action["timezone"] || DateTimeChange.timezone(),
      "date" => action["date"],
      "exact_time" => action["exact_time"],
      "time_window" => action["time_window"],
      "base_plan_version" => action["base_plan_version"],
      "current" => get_in(state, ["exact_time", "value"]),
      "current_date" => get_in(state, ["date", "value"]),
      "proposed_by_user_id" => action["actor_user_id"],
      "truth" => "proposed",
      "explicit" => true
    }

    state
    |> Map.put("proposal_history", history)
    |> put_change_proposal(proposal)
  end

  defp apply_action(state, %{"kind" => "change_propose", "field" => "datetime", "value" => value} = action)
       when is_binary(value) do
    context = %{
      "exact_time" => get_in(state, ["exact_time", "value"]),
      "date" => get_in(state, ["date", "value"]),
      "reference_on" => "2026-09-27"
    }

    case DateTimeChange.interpret(value, context, scoped: true) do
      {:change, change} ->
        if DateTimeChange.confirmation_required?(state) do
          put_change_proposal(state, datetime_proposal(state, change, action["actor_user_id"]))
        else
          apply_datetime_change(state, change, nil, action["actor_user_id"])
        end

      {:clarify, prompt} ->
        Map.put(state, "clarify", prompt)

      :keep ->
        Map.delete(state, "change_proposal")

      :none ->
        Map.put(state, "clarify", "Say a day, a time, or both.")
    end
  end

  defp apply_action(state, %{"kind" => "change_propose", "field" => field, "value" => value} = action)
       when is_binary(field) and is_binary(value) do
    put_change_proposal(state, field, value, action["actor_user_id"])
  end

  defp apply_action(state, %{"kind" => "delegate_datetime", "actor_user_id" => holder}) when is_binary(holder) do
    Map.put(state, "decision_rights", %{
      "datetime" => %{
        "mode" => "delegated",
        "holder_user_id" => holder,
        "scope" => "this_plan",
        "explicit" => true
      }
    })
  end

  defp apply_action(state, %{"kind" => "change_keep"}) do
    Map.delete(state, "change_proposal")
  end

  defp apply_action(state, %{"kind" => "change_accept"} = action) do
    proposal = state["change_proposal"]
    actor = action["actor_user_id"]

    cond do
      not is_map(proposal) ->
        state

      proposal["status"] == "superseded" ->
        state

      is_binary(action["proposal_id"]) and action["proposal_id"] != proposal["proposal_id"] ->
        state

      is_integer(proposal["base_plan_version"]) and proposal["base_plan_version"] != (state["plan_version"] || 0) ->
        put_change_proposal(state, Map.put(proposal, "status", "stale"))

      proposal["proposed_by_user_id"] == actor ->
        state

      true ->
        state
        |> apply_accepted_change(proposal, actor)
        |> Map.delete("change_proposal")
        |> Map.update("plan_version", 1, &(&1 + 1))
    end
  end

  defp apply_action(state, %{"kind" => "exact_time_lock", "value" => value} = action) when is_binary(value) do
    previous = get_in(state, ["exact_time", "value"])

    next =
      put_field(state, "exact_time", "locked", value, nil, %{
        "explicit" => true,
        "truth" => "locked",
        "needs_confirm" => false,
        "actor_user_id" => action["actor_user_id"]
      })

    if previous in [nil, value], do: next, else: clear_execution(next)
  end

  defp apply_action(state, %{"kind" => "activity_lock", "value" => value} = action) when is_binary(value) do
    case ActivityIntent.compile_freeform(value) do
      nil ->
        state

      intent ->
        label = intent["normalized_label"]
        previous_state = field_state(state, "activity")
        previous_value = get_in(state, ["activity", "value"])

        next =
          put_field(state, "activity", "locked", label, nil, %{
            "explicit" => true,
            "truth" => "user_stated",
            "actor_user_id" => action["actor_user_id"],
            "category" => intent["category"],
            "subtype" => intent["subtype"],
            "scope" => intent["scope"],
            "execution_type" => intent["execution_type"],
            "raw_text" => intent["raw_text"]
          })

        if previous_state == "locked" and previous_value != label do
          next |> clear_place() |> clear_execution()
        else
          next
        end
    end
  end

  defp apply_action(state, %{"kind" => "place_propose", "value" => value} = action) when is_binary(value) do
    case canonical_from_text(value) do
      nil ->
        state

      name ->
        if field_state(state, "place") == "locked" do
          state
        else
          propose_place(state, name, nil, action["actor_user_id"])
        end
    end
  end

  defp apply_action(state, %{"kind" => "place_confirm", "actor_user_id" => actor}) when is_binary(actor) do
    proposed_by = get_in(state, ["place", "proposed_by_user_id"])
    value = get_in(state, ["place", "value"])

    if field_state(state, "place") == "candidate" and is_binary(value) and actor != proposed_by do
      lock_place(state, value, nil, actor, "confirmed")
    else
      state
    end
  end

  defp apply_action(state, %{"kind" => "place_decline"}) do
    if field_state(state, "place") in ["candidate", "conflicted"], do: clear_place(state), else: state
  end

  defp apply_action(state, %{"kind" => "place_reopen"}) do
    if field_state(state, "place") == "locked" do
      state |> clear_place() |> clear_execution()
    else
      state
    end
  end

  defp apply_action(state, %{"kind" => "place_lock", "value" => value} = action) when is_binary(value) do
    if canonical_from_text(value) do
      lock_place(state, canonical_from_text(value), nil, action["actor_user_id"], "restored")
    else
      state
    end
  end

  defp apply_action(state, %{"kind" => "reservation_authorize", "actor_user_id" => actor})
       when is_binary(actor) do
    if field_state(state, "place") == "locked" do
      authorize(state, actor)
    else
      state
    end
  end

  defp apply_action(state, %{"kind" => "voice_utterance", "normalized" => text} = action)
       when is_binary(text) do
    next =
      apply_message(state, %{
        "body" => text,
        "sender_user_id" => action["actor_user_id"],
        "id" => action["source_segment_id"]
      })

    case next["change_proposal"] do
      proposal when is_map(proposal) ->
        Map.put(next, "change_proposal", Map.merge(proposal, %{
          "source_type" => "call_transcript",
          "source_call_id" => action["source_call_id"],
          "source_segment_id" => action["source_segment_id"],
          "speaker_user_id" => action["actor_user_id"],
          "confidence" => action["confidence"]
        }))

      _ ->
        next
    end
  end

  defp apply_action(state, _action), do: state

  defp propose_place(state, name, source, actor) do
    current = state["place"] || %{}
    other? = other_proposer?(current, actor)

    cond do
      current["state"] == "conflicted" ->
        converge_conflict(state, name, source, actor)

      current["state"] == "candidate" and current["value"] == name and other? ->
        lock_place(state, name, source, actor, "both_selected")

      current["state"] == "candidate" and is_binary(current["value"]) and current["value"] != name and other? ->
        conflict_place(state, current, name, source, actor)

      true ->
        put_field(state, "place", "candidate", name, source, %{
          "needs_confirm" => true,
          "explicit" => true,
          "truth" => "proposed",
          "proposed_by_user_id" => actor,
          "actor_user_id" => actor,
          "proposals" => [%{"actor_user_id" => actor, "value" => name, "truth" => "proposed"}]
        })
    end
  end

  defp other_proposer?(current, actor) do
    is_binary(actor) and is_binary(current["proposed_by_user_id"]) and actor != current["proposed_by_user_id"]
  end

  defp conflict_place(state, current, name, source, actor) do
    proposals = [
      %{"actor_user_id" => current["proposed_by_user_id"], "value" => current["value"], "truth" => "proposed"},
      %{"actor_user_id" => actor, "value" => name, "truth" => "proposed"}
    ]

    put_field(state, "place", "conflicted", nil, source, %{
      "explicit" => true,
      "truth" => "proposed",
      "needs_confirm" => false,
      "proposals" => proposals,
      "proposed_by_user_id" => nil,
      "actor_user_id" => actor
    })
  end

  defp converge_conflict(state, name, source, actor) do
    proposals = get_in(state, ["place", "proposals"]) || []
    others = Enum.reject(proposals, &(&1["actor_user_id"] == actor))
    own = Enum.find(proposals, &(&1["actor_user_id"] == actor))

    cond do
      Enum.any?(others, &(&1["value"] == name)) ->
        lock_place(state, name, source, actor, "converged")

      is_map(own) and own["value"] == name ->
        state

      is_binary(actor) ->
        updated =
          proposals
          |> Enum.reject(&(&1["actor_user_id"] == actor))
          |> Kernel.++([%{"actor_user_id" => actor, "value" => name, "truth" => "proposed"}])

        case updated |> Enum.map(& &1["value"]) |> Enum.uniq() do
          [only] ->
            lock_place(state, only, source, actor, "converged")

          _ ->
            put_field(state, "place", "conflicted", nil, source, %{
              "explicit" => true,
              "truth" => "proposed",
              "needs_confirm" => false,
              "proposals" => updated,
              "proposed_by_user_id" => nil,
              "actor_user_id" => actor
            })
        end

      true ->
        state
    end
  end

  defp lock_place(state, name, source, actor, how) do
    proposals = get_in(state, ["place", "proposals"]) || []
    origin = Enum.find(proposals, &(&1["value"] == name))
    proposed_by = (origin && origin["actor_user_id"]) || get_in(state, ["place", "proposed_by_user_id"]) || actor

    put_field(state, "place", "locked", name, source, %{
      "explicit" => true,
      "truth" => "locked",
      "needs_confirm" => false,
      "proposed_by_user_id" => proposed_by,
      "confirmed_by_user_id" => actor,
      "lock_reason" => how,
      "actor_user_id" => actor,
      "proposals" => proposals
    })
  end

  defp clear_place(state) do
    put_field(state, "place", "unknown", nil, nil, %{"explicit" => true, "truth" => nil})
  end

  defp clear_execution(state) do
    put_field(state, "execution", "unknown", nil, nil, %{
      "explicit" => true,
      "truth" => nil,
      "executed" => false,
      "authorized_by" => []
    })
  end

  defp authorize(state, actor) do
    current = state["execution"] || %{}
    authorized = Enum.uniq(List.wrap(current["authorized_by"]) ++ [actor])
    members = get_in(state, ["participants", "value"]) || []
    complete? = members != [] and Enum.all?(members, &(&1 in authorized))

    put_field(state, "execution", if(complete?, do: "agreed", else: "candidate"), "reservation_not_sent", nil, %{
      "explicit" => true,
      "truth" => if(complete?, do: "agreed", else: "proposed"),
      "authorized_by" => authorized,
      "needs_confirm" => not complete?,
      "executed" => false
    })
  end

  defp present(state) do
    state = blank_ui(state)
    date = state["date"] || %{}
    exact = state["exact_time"] || %{}
    place = state["place"] || %{}
    activity = get_in(state, ["activity", "value"])
    date_label = if date["value"] == "tomorrow", do: "tomorrow", else: date["value"]

    done =
      cond do
        not is_binary(exact["value"]) ->
          nil

        is_binary(date_label) ->
          "#{String.capitalize(date_label)} at #{exact["value"]} is set ✓"

        true ->
          "#{exact["value"]} is set ✓"
      end

    cond do
      exact["state"] == "candidate" and exact["needs_confirm"] == true and is_binary(exact["value"]) ->
        when_label = [date_label, "at", exact["value"]] |> Enum.reject(&is_nil/1) |> Enum.join(" ")
        held = if place["state"] == "locked" and is_binary(place["value"]), do: "#{place["value"]} stays set", else: nil

        state
        |> Map.put("prompt", "Confirm #{when_label}?")
        |> Map.put("confirmable", true)
        |> Map.put("completion", held)
        |> Map.put("next", "exact_time")

      exact["state"] == "locked" and place["state"] == "conflicted" ->
        options =
          (place["proposals"] || [])
          |> Enum.map(fn proposal ->
            %{"name" => proposal["value"], "proposed_by_user_id" => proposal["actor_user_id"]}
          end)

        state
        |> Map.put("completion", done)
        |> Map.put("prompt", "You picked different places.")
        |> Map.put("next", "place")
        |> Map.put("place_conflicted", true)
        |> Map.put("conflict_options", options)

      exact["state"] == "locked" and place["state"] == "candidate" and is_binary(place["value"]) ->
        state
        |> Map.put("completion", done)
        |> Map.put("prompt", "#{place["value"]}?")
        |> Map.put("next", "place")
        |> Map.put("place_confirmable", true)
        |> Map.put("proposed_by_user_id", place["proposed_by_user_id"])

      exact["state"] == "locked" and place["state"] == "locked" and is_binary(place["value"]) ->
        place_done =
          if is_binary(date_label),
            do: "#{String.capitalize(date_label)} at #{exact["value"]} · #{place["value"]} is set ✓",
            else: "#{exact["value"]} · #{place["value"]} is set ✓"

        execution_state = field_state(state, "execution")
        lines = [date_label && String.capitalize(date_label), exact["value"], place["value"]] |> Enum.reject(&is_nil/1)

        {commitment, prompt, detail} =
          case execution_state do
            "agreed" ->
              {"execution_ready", "Reservation approved", "Booking hasn't been placed yet."}

            "candidate" ->
              {"aligned", "Waiting on one response.", "Reservation isn't booked."}

            _ ->
              {"aligned", "Plan set ✓", nil}
          end

        state
        |> Map.put("completion", place_done)
        |> Map.put("plan_lines", lines)
        |> Map.put("commitment", commitment)
        |> Map.put("change_quiet", true)
        |> Map.put("prompt", prompt)
        |> Map.put("detail", detail)
        |> Map.put("next", "execution")
        |> Map.put("place_changeable", false)
        |> Map.put("reservation_authorizable", execution_state != "agreed")
        |> Map.put("proposed_by_user_id", place["proposed_by_user_id"])

      exact["state"] == "locked" and place["state"] in [nil, "unknown"] and
          CandidateProvider.recommend(activity || "", get_in(state, ["participants", "value"]) || [], state, %{}) !=
            [] ->
        candidates =
          CandidateProvider.recommend(activity || "", get_in(state, ["participants", "value"]) || [], state, %{})

        state
        |> Map.put("completion", done)
        |> Map.put("prompt", "Shared catalog options. Curated list only. No live travel, availability, or trend.")
        |> Map.put("next", "place")
        |> Map.put("activity_changeable", field_state(state, "activity") == "locked")
        |> Map.put("candidates", candidates)

      exact["state"] == "locked" and place["state"] in [nil, "unknown"] and field_state(state, "activity") == "locked" ->
        execution_type = get_in(state, ["activity", "execution_type"])
        label = get_in(state, ["activity", "value"]) || "This"

        prompt =
          if execution_type in ["reservation", nil] do
            "Name a place in the chat when you both know it."
          else
            "#{label}. Search connection not available yet."
          end

        state
        |> Map.put("completion", done)
        |> Map.put("prompt", prompt)
        |> Map.put("next", "place")

      exact["state"] == "locked" and place["state"] in [nil, "unknown"] ->
        state
        |> Map.put("completion", done)
        |> Map.put("prompt", "What kind of meetup?")
        |> Map.put("next", "activity")
        |> Map.put("activity_choices", ["Coffee", "Dinner", "Drinks", "Something active", "Somewhere quiet"])

      true ->
        state
    end
    |> maybe_mark_activity_changeable()
    |> surface_change_proposal()
  end

  defp surface_change_proposal(state) do
    case state["change_proposal"] do
      %{"field" => "place", "value" => "reopen"} = proposal ->
        current = get_in(state, ["place", "value"]) || "The current place"

        state
        |> Map.put("prompt", "Suggested choosing a different place.")
        |> Map.put("detail", "#{current} stays until this is accepted or kept.")
        |> Map.put("change_proposal", proposal)

      %{"value" => value} = proposal when is_binary(value) ->
        state
        |> Map.put("prompt", "Suggested #{value} instead.")
        |> Map.put("detail", "The current plan stays until this is accepted or kept.")
        |> Map.put("change_proposal", proposal)

      _ ->
        if is_binary(state["clarify"]) do
          Map.put(state, "prompt", state["clarify"])
        else
          state
        end
    end
  end

  defp put_change_proposal(state, proposal) when is_map(proposal) do
    Map.put(state, "change_proposal", proposal)
  end

  defp put_change_proposal(state, field, value, actor) do
    Map.put(state, "change_proposal", %{
      "field" => field,
      "value" => value,
      "current" => get_in(state, [field, "value"]),
      "proposed_by_user_id" => actor,
      "truth" => "proposed",
      "explicit" => true
    })
  end

  defp apply_accepted_change(state, %{"field" => "datetime"} = proposal, _accepter) do
    state
    |> put_parsed_date(proposal, nil)
    |> put_parsed_time(proposal, nil)
    |> put_parsed_window(proposal, nil)
    |> clear_execution()
  end

  defp apply_accepted_change(state, %{"field" => "exact_time", "value" => value}, _accepter)
       when is_binary(value) do
    state
    |> put_field("exact_time", "locked", value, nil, %{
      "explicit" => true,
      "truth" => "locked",
      "needs_confirm" => false
    })
    |> clear_execution()
  end

  defp apply_accepted_change(state, %{"field" => "activity", "value" => value} = proposal, _accepter)
       when is_binary(value) do
    state
    |> apply_action(%{
      "kind" => "activity_lock",
      "value" => value,
      "actor_user_id" => proposal["proposed_by_user_id"]
    })
    |> clear_execution()
  end

  defp apply_accepted_change(state, %{"field" => "place", "value" => "reopen"}, _accepter) do
    state |> clear_place() |> clear_execution()
  end

  defp apply_accepted_change(state, %{"field" => "place", "value" => value, "proposed_by_user_id" => proposer}, accepter)
       when is_binary(value) do
    name = canonical_from_text(value) || value

    state
    |> clear_place()
    |> clear_execution()
    |> propose_place(name, nil, proposer)
    |> lock_place(name, nil, accepter, "change_accepted")
  end

  defp apply_accepted_change(state, _proposal, _accepter), do: state

  defp maybe_mark_activity_changeable(state) do
    if field_state(state, "activity") == "locked" do
      Map.put(state, "activity_changeable", true)
    else
      state
    end
  end

  defp blank_ui(state) do
    Map.merge(state, %{
      "prompt" => nil,
      "completion" => nil,
      "next" => nil,
      "confirmable" => false,
      "activity_choices" => nil,
      "candidates" => nil,
      "place_confirmable" => false,
      "place_conflicted" => false,
      "conflict_options" => nil,
      "place_changeable" => false,
      "activity_changeable" => false,
      "reservation_authorizable" => false,
      "change_quiet" => false,
      "plan_lines" => nil,
      "detail" => nil,
      "commitment" => nil,
      "proposed_by_user_id" => get_in(state, ["place", "proposed_by_user_id"])
    })
  end

  defp actions_from_plan(nil), do: []

  defp actions_from_plan(%SharedPlan{} = plan) do
    alignment = plan.alignment || %{}
    stored = Map.get(alignment, "explicit_actions") || []

    if stored == [] do
      synthesize_locked_actions(alignment, plan)
    else
      stored
    end
  end

  defp synthesize_locked_actions(alignment, plan) do
    at = plan.updated_at || plan.inserted_at
    iso = if match?(%DateTime{}, at), do: DateTime.to_iso8601(at), else: nil
    actor = plan.created_by_user_id

    []
    |> maybe_synth_lock(alignment, "exact_time", "exact_time_lock", iso, actor)
    |> maybe_synth_activity(alignment, iso, actor)
    |> maybe_synth_place(alignment, iso, actor)
  end

  defp maybe_synth_lock(actions, alignment, field, kind, iso, actor) do
    current = alignment[field] || %{}

    if current["state"] == "locked" and is_binary(current["value"]) do
      actions ++ [synth_action(kind, actor, current["value"], "locked", iso)]
    else
      actions
    end
  end

  defp maybe_synth_activity(actions, alignment, iso, actor) do
    current = alignment["activity"] || %{}
    value = current["value"]

    if current["state"] == "locked" and is_binary(value) and String.downcase(value) in @activities do
      actions ++ [synth_action("activity_lock", actor, String.downcase(value), "user_stated", iso)]
    else
      actions
    end
  end

  defp maybe_synth_place(actions, alignment, iso, actor) do
    current = alignment["place"] || %{}

    if current["state"] == "locked" and is_binary(current["value"]) and canonical_from_text(current["value"]) do
      actions ++ [synth_action("place_lock", actor, current["value"], "locked", iso)]
    else
      actions
    end
  end

  defp synth_action(kind, actor, value, truth, iso) do
    %{
      "kind" => kind,
      "actor_user_id" => actor,
      "value" => value,
      "truth" => truth,
      "explicit" => true,
      "schema_version" => @schema_version,
      "at" => iso
    }
  end

  defp append_action(conversation_id, action_map) do
    Repo.transaction(fn ->
      case lock_plan(conversation_id) do
        nil ->
          Repo.rollback(:no_plan)

        %SharedPlan{} = plan ->
          alignment = plan.alignment || %{}
          actions = Map.get(alignment, "explicit_actions") || []

          if duplicate_action?(List.last(actions), action_map) do
            :ok
          else
            updated = Map.put(alignment, "explicit_actions", actions ++ [action_map])

            case plan |> SharedPlan.changeset(%{alignment: updated}) |> Repo.update() do
              {:ok, saved} ->
                case record_alignment_event(saved, action_map) do
                  :ok -> :ok
                  {:error, reason} -> Repo.rollback(reason)
                end

              {:error, _} ->
                Repo.rollback(:persist_failed)
            end
          end
      end
    end)
    |> case do
      {:ok, :ok} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp duplicate_action?(
         %{"kind" => kind, "actor_user_id" => actor, "value" => value},
         %{"kind" => kind, "actor_user_id" => actor, "value" => value}
       ), do: true

  defp duplicate_action?(_, _), do: false

  defp record_alignment_event(%SharedPlan{} = plan, action_map) do
    case alignment_event_type(plan, action_map) do
      nil ->
        :ok

      event_type ->
        case Publisher.record(%{
               event_type: event_type,
               aggregate_type: "shared_plan",
               aggregate_id: plan.id,
               partition_key: plan.conversation_id,
               actor_user_id: action_map["actor_user_id"],
               conversation_id: plan.conversation_id,
               plan_id: plan.id,
               source_type: "alignment_action",
               source_id: action_map["kind"],
               privacy_class: "shared_authorized",
               privacy_scope: "shared",
               consent_scope: "participants",
               relationship_scope: plan.conversation_id,
               purpose: "alignment",
               payload: %{
                 "conversation_id" => plan.conversation_id,
                 "plan_id" => plan.id,
                 "actor_user_id" => action_map["actor_user_id"],
                 "kind" => action_map["kind"],
                 "value" => action_map["value"]
               }
             }) do
          {:ok, _} -> :ok
          {:error, reason} -> {:error, reason}
        end
    end
  end

  defp alignment_event_type(plan, %{"kind" => "activity_lock", "value" => value} = action) do
    previous = get_in(plan.alignment || %{}, ["activity", "value"])
    previous_state = get_in(plan.alignment || %{}, ["activity", "state"])
    normalized = value |> to_string() |> String.downcase()

    if previous_state == "locked" and is_binary(previous) and String.downcase(previous) != normalized and
         action["actor_user_id"] do
      "alignment.activity_changed"
    else
      "alignment.activity_selected"
    end
  end

  defp alignment_event_type(plan, %{"kind" => "place_propose", "value" => value, "actor_user_id" => actor}) do
    place = get_in(plan.alignment || %{}, ["place"]) || %{}

    if place["state"] in ["candidate", "conflicted"] and place["value"] not in [nil, value] and
         place["proposed_by_user_id"] not in [nil, actor] do
      "alignment.place_conflicted"
    else
      "alignment.place_nominated"
    end
  end

  defp alignment_event_type(_plan, %{"kind" => "place_confirm"}), do: "alignment.place_confirmed"
  defp alignment_event_type(_plan, %{"kind" => "place_reopen"}), do: "alignment.place_changed"
  defp alignment_event_type(_plan, %{"kind" => "place_decline"}), do: "alignment.place_changed"
  defp alignment_event_type(_plan, %{"kind" => "reservation_authorize"}), do: "execution.reservation_authorized"
  defp alignment_event_type(_plan, %{"kind" => "exact_time_lock"}), do: "alignment.time_locked"
  defp alignment_event_type(_plan, %{"kind" => "change_propose"}), do: "alignment.change_proposed"
  defp alignment_event_type(_plan, %{"kind" => "change_accept"}), do: "alignment.change_accepted"
  defp alignment_event_type(_plan, %{"kind" => "change_keep"}), do: "alignment.change_rejected"
  defp alignment_event_type(_plan, _action), do: nil

  defp action(kind, actor, value, truth) do
    %{
      "kind" => kind,
      "actor_user_id" => actor,
      "value" => value,
      "truth" => truth,
      "explicit" => true,
      "schema_version" => @schema_version,
      "at" => DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()
    }
  end

  # One open lineage per conversation. A later unrelated intent needs a new
  # SharedPlan row. This fold must not be reused as a second plan.
  defp lineage_id(conversation_id) do
    case Repo.get_by(SharedPlan, conversation_id: conversation_id) do
      %SharedPlan{id: id} -> id
      _ -> conversation_id
    end
  end

  defp upsert_plan(conversation_id, state, user_id) do
    exact = state["exact_time"] || %{}
    date = state["date"] || %{}
    status = if exact["state"] == "locked", do: "agreed", else: "tentative"
    time_label = [date["value"], exact["value"] || get_in(state, ["time_window", "value"])] |> Enum.reject(&is_nil/1) |> Enum.join(" ")

    attrs = %{
      conversation_id: conversation_id,
      title: "Meetup",
      status: status,
      timezone: "America/Los_Angeles",
      time_label: if(time_label == "", do: nil, else: time_label),
      created_by_user_id: user_id,
      alignment: Map.put(state, "lineage_id", lineage_id(conversation_id))
    }

    case Repo.get_by(SharedPlan, conversation_id: conversation_id) do
      nil when is_binary(user_id) ->
        %SharedPlan{} |> SharedPlan.changeset(attrs) |> Repo.insert()

      %SharedPlan{} = plan ->
        plan |> SharedPlan.changeset(attrs) |> Repo.update()

      _ ->
        {:error, :no_owner}
    end
  end

  defp propose_exact(state, value, id) do
    window = get_in(state, ["time_window", "value"])
    inside? = window == "after 6 PM" and value != "6:00 PM"

    state
    |> put_field("exact_time", if(inside?, do: "locked", else: "candidate"), value, id)
    |> put_in(["exact_time", "needs_confirm"], not inside?)
  end

  defp field(field_state, value, source) do
    %{
      "state" => field_state,
      "value" => value,
      "source_message_id" => source,
      "needs_confirm" => false,
      "explicit" => field_state == "locked",
      "truth" => truth_for(field_state),
      "schema_version" => @schema_version
    }
  end

  defp put_field(state, key, field_state, value, source, extras \\ %{}) do
    Map.put(state, key, Map.merge(%{
      "state" => field_state,
      "value" => value,
      "source_message_id" => source,
      "needs_confirm" => false,
      "explicit" => true,
      "truth" => truth_for(field_state),
      "schema_version" => @schema_version
    }, extras))
  end

  defp truth_for("locked"), do: "locked"
  defp truth_for("candidate"), do: "proposed"
  defp truth_for("constrained"), do: "user_stated"
  defp truth_for("agreed"), do: "agreed"
  defp truth_for(_), do: nil

  defp canonical_place(name) when is_binary(name) do
    case canonical_from_text(name) do
      nil -> {:error, :unknown_place}
      canonical -> {:ok, canonical}
    end
  end

  defp canonical_place(_), do: {:error, :unknown_place}

  defp canonical_from_text(text) when is_binary(text) do
    down = String.downcase(text)

    cond do
      String.contains?(down, "juniper") -> "Juniper & Ivy"
      String.contains?(down, "herb") and String.contains?(down, "wood") -> "Herb & Wood"
      String.contains?(down, "fort") and String.contains?(down, "oak") -> "Fort Oak"
      true -> nil
    end
  end

  defp canonical_from_text(_), do: nil

  defp place_retarget?(text) do
    Regex.match?(~r/\b(actually|instead|change to|switch to)\b/, text)
  end

  defp event_at(%{inserted_at: %DateTime{} = dt}, _index), do: DateTime.to_unix(dt, :microsecond)
  defp event_at(%{"at" => at}, _index) when is_binary(at) do
    case DateTime.from_iso8601(at) do
      {:ok, dt, _} -> DateTime.to_unix(dt, :microsecond)
      _ -> 0
    end
  end

  defp event_at(%{"seq" => seq}, _index) when is_integer(seq), do: seq
  defp event_at(%{seq: seq}, _index) when is_integer(seq), do: seq
  defp event_at(_, index), do: index

  defp field_state(state, key), do: get_in(state, [key, "state"]) || "unknown"

  defp message_body(%{body: body}), do: body || ""
  defp message_body(%{"body" => body}), do: body || ""
  defp message_body(_), do: ""

  defp message_id(%{id: id}), do: id
  defp message_id(%{"id" => id}), do: id
  defp message_id(_), do: nil

  defp message_actor(%{sender_user_id: id}), do: id
  defp message_actor(%{"sender_user_id" => id}), do: id
  defp message_actor(_), do: nil

  defp normalize(body), do: body |> String.downcase() |> String.trim()

  defp trivial?(text) do
    Regex.match?(~r/\A(hey|hi|hello|thanks|thank you|ok|okay)[!. ]*\z/, text)
  end
end
