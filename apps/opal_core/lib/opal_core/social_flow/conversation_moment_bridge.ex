defmodule OpalCore.SocialFlow.ConversationMomentBridge do
  @moduledoc """
  Phase 1A — Conversation chronology → SocialMoment publish bridge.

  After Chronology persists a consequential moment, optionally projects a
  participants-only SocialMoment onto the Home feed path via the existing
  SocialMomentPublishing.publish/2 surface.

  Wired kinds only: plan_forming, set, place_resolved, follow_through.
  Publish failure never raises into the message path.
  HARD BAN: no closeness / volatility / affinity / relationship scores.
  """

  require Logger

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{ConversationMember, Message}
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    OpalChronologyMoment,
    SharedPlan,
    SocialMomentPublishing,
    SocialMomentVisibility
  }

  @wired_kinds ~w(plan_forming set place_resolved follow_through)

  @stage_words %{
    "plan_forming" => "taking shape",
    "set" => "set",
    "place_resolved" => "place decided",
    "follow_through" => "happening"
  }

  # Participants-only among supported_visibilities():
  # private = author only; friends = broader graph; group = membership-dynamic;
  # specific_people = exact audience_user_ids list (conversation peers excluding author).
  @participants_visibility "specific_people"

  def wired_kinds, do: @wired_kinds

  def participants_visibility do
    vis = SocialMomentVisibility.supported_visibilities()

    if @participants_visibility in vis do
      @participants_visibility
    else
      raise "participants visibility #{@participants_visibility} missing from supported_visibilities()"
    end
  end

  @doc """
  Build publish attrs from a chronology moment + conversation context.

  Returns `{:ok, author_user_id, attrs}` or `:skipped`.
  """
  def build_publish_attrs(moment, conversation) do
    kind = moment_kind(moment)

    if kind in @wired_kinds do
      conversation_id = conversation_id(conversation, moment)
      participant_ids = participant_ids(conversation_id)

      case resolve_author(moment, participant_ids) do
        nil ->
          :skipped

        author_user_id ->
          audience = Enum.reject(participant_ids, &(&1 == author_user_id))
          moment_id = moment_id(moment)
          caption = build_caption(kind, conversation_id, participant_ids)

          attrs = %{
            "caption" => caption,
            "visibility" => participants_visibility(),
            "audience_user_ids" => audience,
            "group_conversation_id" => conversation_id,
            "social_context" =>
              Jason.encode!(%{
                "source" => "chronology",
                "moment_kind" => kind,
                "moment_id" => moment_id
              }),
            "source_lineage_id" => moment_id
          }

          {:ok, author_user_id, attrs}
      end
    else
      :skipped
    end
  end

  @doc """
  Publish a SocialMoment from a chronology row when the kind is wired.

  opts:
  - `:publish_fun` — test seam defaulting to SocialMomentPublishing.publish/2
  """
  def maybe_publish_from_chronology(moment, conversation, opts \\ [])

  def maybe_publish_from_chronology(moment, conversation, opts)
      when not is_nil(moment) and not is_nil(conversation) do
    publish_fun = Keyword.get(opts, :publish_fun, &SocialMomentPublishing.publish/2)

    case build_publish_attrs(moment, conversation) do
      :skipped ->
        :skipped

      {:ok, author_user_id, attrs} ->
        case publish_fun.(author_user_id, attrs) do
          {:ok, _} ->
            :published

          {:error, reason} ->
            Logger.warning(
              "ConversationMomentBridge publish skipped moment_id=#{moment_id(moment)} reason=#{inspect(reason)}"
            )

            :skipped

          other ->
            Logger.warning(
              "ConversationMomentBridge publish skipped moment_id=#{moment_id(moment)} reason=#{inspect(other)}"
            )

            :skipped
        end
    end
  rescue
    error ->
      Logger.warning(
        "ConversationMomentBridge publish skipped moment_id=#{moment_id(moment)} reason=#{inspect(error)}"
      )

      :skipped
  end

  def maybe_publish_from_chronology(_, _, _), do: :skipped

  defp build_caption(kind, conversation_id, participant_ids) do
    case plan_title(conversation_id) do
      title when is_binary(title) and title != "" ->
        names =
          participant_ids
          |> first_names()
          |> Enum.join(", ")

        stage = Map.fetch!(@stage_words, kind)

        if names == "" do
          "#{title} — #{stage}"
        else
          "#{title} with #{names} — #{stage}"
        end

      _ ->
        ""
    end
  end

  defp plan_title(conversation_id) when is_binary(conversation_id) do
    case Repo.get_by(SharedPlan, conversation_id: conversation_id) do
      %SharedPlan{title: title} when is_binary(title) ->
        trimmed = String.trim(title)
        if trimmed == "", do: nil, else: trimmed

      _ ->
        nil
    end
  end

  defp plan_title(_), do: nil

  defp first_names(user_ids) do
    users =
      from(u in User, where: u.id in ^user_ids, select: {u.id, u.display_name})
      |> Repo.all()
      |> Map.new()

    user_ids
    |> Enum.map(fn id ->
      case Map.get(users, id) do
        name when is_binary(name) and name != "" ->
          name |> String.trim() |> String.split(~r/\s+/, trim: true) |> List.first()

        _ ->
          nil
      end
    end)
    |> Enum.reject(&is_nil/1)
  end

  defp resolve_author(moment, participant_ids) do
    evidence_id = evidence_message_id(moment)

    from_message =
      if is_binary(evidence_id) do
        case Repo.get(Message, evidence_id) do
          %Message{sender_user_id: sid} when is_binary(sid) -> sid
          _ -> nil
        end
      else
        nil
      end

    cond do
      is_binary(from_message) and from_message in participant_ids -> from_message
      is_binary(from_message) -> from_message
      participant_ids != [] -> hd(participant_ids)
      true -> nil
    end
  end

  defp participant_ids(conversation_id) when is_binary(conversation_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id,
      select: cm.user_id,
      order_by: [asc: cm.inserted_at]
    )
    |> Repo.all()
    |> Enum.uniq()
  end

  defp participant_ids(_), do: []

  defp conversation_id(%{id: id}, _) when is_binary(id), do: id
  defp conversation_id(%{"id" => id}, _) when is_binary(id), do: id
  defp conversation_id(id, _) when is_binary(id), do: id

  defp conversation_id(_, %OpalChronologyMoment{conversation_id: id}) when is_binary(id), do: id
  defp conversation_id(_, %{conversation_id: id}) when is_binary(id), do: id
  defp conversation_id(_, %{"conversation_id" => id}) when is_binary(id), do: id
  defp conversation_id(_, _), do: nil

  defp moment_kind(%OpalChronologyMoment{kind: kind}), do: to_string(kind || "")
  defp moment_kind(%{kind: kind}), do: to_string(kind || "")
  defp moment_kind(%{"kind" => kind}), do: to_string(kind || "")
  defp moment_kind(_), do: ""

  defp moment_id(%OpalChronologyMoment{id: id}), do: id
  defp moment_id(%{id: id}) when is_binary(id), do: id
  defp moment_id(%{"id" => id}) when is_binary(id), do: id
  defp moment_id(_), do: nil

  defp evidence_message_id(%OpalChronologyMoment{evidence_message_id: id}), do: id
  defp evidence_message_id(%{evidence_message_id: id}), do: id
  defp evidence_message_id(%{"evidence_message_id" => id}), do: id
  defp evidence_message_id(_), do: nil
end
