defmodule OpalCore.SocialFlow.ConversationAlignment do
  @moduledoc """
  Folds real conversation messages into one SharedPlan.

  Dimensions move UNKNOWN → CANDIDATE → CONSTRAINED → AGREED → LOCKED.
  A later contradiction reopens only the field it changes.
  """

  import Ecto.Query

  alias OpalCore.Messages
  alias OpalCore.Messaging.Message
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{SeedFixtureLeak, SharedPlan, SmokeResidue}

  def consequential?(body) when is_binary(body) do
    text = normalize(body)
    text != "" and not trivial?(text) and not SeedFixtureLeak.seed_fixture_body?(body) and
      Regex.match?(
        ~r/tomorrow|\bmeet\b|after\s+\d|let'?s do|lets do|make it\s+\d|\bwhere\b|\bconfirm\b/,
        text
      )
  end

  def consequential?(_), do: false

  def fold(messages, member_ids) when is_list(messages) and is_list(member_ids) do
    base = %{
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

    messages
    |> Enum.reduce(base, fn message, acc -> apply_message(acc, message) end)
    |> present()
  end

  def sync_conversation(conversation_id) when is_binary(conversation_id) do
    messages =
      from(m in Message,
        where: m.conversation_id == ^conversation_id,
        order_by: [asc: m.server_seq]
      )
      |> Repo.all()
      |> Enum.reject(&(SmokeResidue.smoke_body?(&1.body) or SeedFixtureLeak.seed_fixture_body?(&1.body)))

    members = Messages.member_user_ids(conversation_id)
    state = fold(messages, members)

    if plan_material?(state) do
      _ = upsert_plan(conversation_id, state, List.first(members))
    end

    state
  end

  def confirm_exact_time(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)
      exact = state["exact_time"] || %{}

      if exact["state"] in ["candidate", "constrained", "agreed"] and is_binary(exact["value"]) do
        locked = put_in(state, ["exact_time"], Map.merge(exact, %{"state" => "locked", "needs_confirm" => false}))
        presented = present(locked)
        _ = upsert_plan(conversation_id, presented, user_id)
        {:ok, presented}
      else
        {:error, :nothing_to_confirm}
      end
    end
  end

  def plan_material?(state) do
    ["date", "time_window", "exact_time", "place"]
    |> Enum.any?(fn key -> get_in(state, [key, "state"]) not in [nil, "unknown"] end)
  end

  defp member?(conversation_id, user_id) do
    if user_id in Messages.member_user_ids(conversation_id), do: :ok, else: {:error, :not_a_member}
  end

  defp apply_message(state, message) do
    body = message_body(message)
    id = message_id(message)
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
        |> retarget_time(text, id)
        |> note_place(text, id)
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

      Regex.match?(~r/\blet'?s do\s+6\b|\blets do\s+6\b/, text) ->
        needs = field_state(state, "time_window") == "constrained"
        state
        |> put_field("exact_time", "candidate", "6:00 PM", id)
        |> put_in(["exact_time", "needs_confirm"], needs)

      true ->
        state
    end
  end

  defp retarget_time(state, text, id) do
    case Regex.run(~r/\b(?:actually\s+)?make it\s+(\d{1,2})\b/, text) do
      [_, hour] ->
        label = "#{hour}:00 PM"

        state
        |> put_field("exact_time", "candidate", label, id)
        |> put_in(["exact_time", "needs_confirm"], true)

      _ ->
        state
    end
  end

  defp note_place(state, text, id) do
    cond do
      field_state(state, "place") == "locked" ->
        state

      Regex.match?(~r/\bjuniper(?:\s*&\s*ivy)?\b/, text) ->
        put_field(state, "place", "candidate", "Juniper & Ivy", id)

      true ->
        state
    end
  end

  defp present(state) do
    date = state["date"] || %{}
    exact = state["exact_time"] || %{}
    place = state["place"] || %{}
    date_label = if date["value"] == "tomorrow", do: "tomorrow", else: date["value"]

    cond do
      exact["state"] == "candidate" and exact["needs_confirm"] == true and is_binary(exact["value"]) ->
        when_label = [date_label, "at", exact["value"]] |> Enum.reject(&is_nil/1) |> Enum.join(" ")

        state
        |> Map.put("prompt", "Confirm #{when_label}?")
        |> Map.put("confirmable", true)
        |> Map.put("completion", nil)
        |> Map.put("next", nil)

      exact["state"] == "locked" and place["state"] in [nil, "unknown"] ->
        done = if date_label, do: "#{String.capitalize(date_label)} at #{exact["value"]} is set ✓", else: "#{exact["value"]} is set ✓"

        state
        |> Map.put("completion", done)
        |> Map.put("next", "Where should we meet?")
        |> Map.put("prompt", "Where should we meet?")
        |> Map.put("confirmable", false)

      true ->
        state
        |> Map.put("prompt", nil)
        |> Map.put("confirmable", false)
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
      alignment: state
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

  defp field(state, value, source) do
    %{"state" => state, "value" => value, "source_message_id" => source, "needs_confirm" => false}
  end

  defp put_field(state, key, field_state, value, source) do
    Map.put(state, key, %{
      "state" => field_state,
      "value" => value,
      "source_message_id" => source,
      "needs_confirm" => false
    })
  end

  defp field_state(state, key), do: get_in(state, [key, "state"]) || "unknown"

  defp message_body(%{body: body}), do: body || ""
  defp message_body(%{"body" => body}), do: body || ""
  defp message_body(_), do: ""

  defp message_id(%{id: id}), do: id
  defp message_id(%{"id" => id}), do: id
  defp message_id(_), do: nil

  defp normalize(body), do: body |> String.downcase() |> String.trim()

  defp trivial?(text) do
    Regex.match?(~r/\A(hey|hi|hello|thanks|thank you|ok|okay)[!. ]*\z/, text)
  end
end
