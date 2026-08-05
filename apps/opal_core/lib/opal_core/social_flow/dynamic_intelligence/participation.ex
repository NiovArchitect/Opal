defmodule OpalCore.SocialFlow.DynamicIntelligence.Participation do
  @moduledoc """
  Private participation states for experience opportunities.

  Group sees only aggregate safe summaries, never private decline reasons.
  """

  @allowed_states ~w(interested not_this_time maybe ask_later keep_private undecided)

  def allowed_states, do: @allowed_states

  def new_state(member_ids) when is_list(member_ids) do
    Map.new(member_ids, fn id ->
      {id,
       %{
         "state" => "undecided",
         "private_reason" => nil,
         "updated_at" => nil
       }}
    end)
  end

  def respond(participation, user_id, action, opts \\ []) when is_map(participation) do
    action = normalize_action(action)

    cond do
      not Map.has_key?(participation, user_id) ->
        {:error, :not_a_participant}

      action not in @allowed_states ->
        {:error, :invalid_action}

      true ->
        private_reason =
          if action in ~w(not_this_time keep_private) do
            Keyword.get(opts, :private_reason)
          else
            nil
          end

        updated = %{
          "state" => action,
          "private_reason" => private_reason,
          "updated_at" =>
            DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601()
        }

        {:ok, Map.put(participation, user_id, updated)}
    end
  end

  def shared_summary(participation) when is_map(participation) do
    states = participation |> Map.values() |> Enum.map(& &1["state"])

    interested = Enum.count(states, &(&1 == "interested"))
    deciding = Enum.count(states, &(&1 in ~w(undecided maybe ask_later keep_private)))
    declined = Enum.count(states, &(&1 == "not_this_time"))

    cond do
      interested > 0 and deciding > 0 ->
        "#{number_word(interested)} #{people_word(interested)} #{are_word(interested)} interested. #{number_word(deciding)} #{are_word(deciding)} still deciding."

      interested > 0 and declined > 0 and deciding == 0 ->
        "#{number_word(interested)} #{people_word(interested)} #{are_word(interested)} interested."

      interested >= 2 and deciding == 0 ->
        "Everyone who responded is interested."

      true ->
        "Still open."
    end
  end

  def shared_summary(_), do: "Still open."

  def journey_state(participation) when is_map(participation) do
    states = participation |> Map.values() |> Enum.map(& &1["state"])
    interested = Enum.count(states, &(&1 == "interested"))
    total = map_size(participation)

    cond do
      interested >= 2 and interested == total -> "ready"
      interested >= 2 -> "still_open"
      interested == 1 -> "still_open"
      true -> "forming"
    end
  end

  def journey_state(_), do: "quiet"

  def private_view(participation, user_id) do
    case Map.get(participation, user_id) do
      nil -> {:error, :not_a_participant}
      row -> {:ok, row}
    end
  end

  def shared_projection(participation) do
    %{
      "summary" => shared_summary(participation),
      "journey_state" => journey_state(participation),
      # Never include per-user private reasons.
      "participant_states_public" =>
        participation
        |> Enum.map(fn {uid, row} ->
          %{
            "user_id" => uid,
            "state" => public_state(row["state"])
          }
        end)
        # Phase 1: do not publish individual states by default; summary only.
        |> then(fn _ -> [] end)
    }
  end

  defp public_state("interested"), do: "interested"
  defp public_state("not_this_time"), do: "passed"
  defp public_state(_), do: "deciding"

  defp normalize_action(a) when is_atom(a), do: Atom.to_string(a)
  defp normalize_action(a) when is_binary(a), do: a
  defp normalize_action(_), do: "invalid"

  defp number_word(1), do: "One"
  defp number_word(2), do: "Two"
  defp number_word(3), do: "Three"
  defp number_word(n), do: Integer.to_string(n)

  defp people_word(1), do: "person"
  defp people_word(_), do: "people"

  defp are_word(1), do: "is"
  defp are_word(_), do: "are"
end
