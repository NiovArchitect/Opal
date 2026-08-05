defmodule OpalCore.SocialFlow.DynamicIntelligence.Audience do
  @moduledoc """
  Audience and privacy projection for experience opportunities.

  Shared payloads must never include private constraints, scores, or locations.
  """

  alias OpalCore.SocialFlow.DynamicIntelligence.CollectiveFit

  # Whole-word / phrase checks via bounded tokens to avoid false positives on display names.
  @forbidden_shared_substrings [
    "cannot afford",
    "can't afford",
    "max_price",
    "price_band",
    "sensory sensitivity",
    "exact location",
    "area_a",
    "area_b",
    "area_c",
    "fit_score",
    "friend score",
    "reliability score",
    "gps coordinate"
  ]

  @forbidden_shared_words ~w(budget sensory gps)

  def member?(member_ids, user_id) when is_list(member_ids) do
    user_id in member_ids
  end

  def member?(_, _), do: false

  def authorize_view(member_ids, user_id) do
    if member?(member_ids, user_id) do
      :ok
    else
      {:error, :forbidden}
    end
  end

  def project_shared(opportunity) when is_map(opportunity) do
    opp = stringify(opportunity)
    preferred = opp["preferred"]
    options = CollectiveFit.strip_internal_scores(opp["options"] || [])

    shared = %{
      "kind" => "opal_experience_moment",
      "conversation_id" => opp["conversation_id"],
      "headline" => opp["headline"] || "This looks promising for the three of you.",
      "primary_option" => preferred_name(preferred),
      "supporting_explanation" =>
        opp["supporting_explanation"] || "Works with everyone’s timing and current preferences.",
      "see_why" => opp["see_why"] || group_safe_see_why(preferred),
      "actions" => ["interested", "not_this_time", "see_why", "keep_private"],
      "options" => Enum.map(options, &public_option/1),
      "option_count" => Enum.count(options),
      "journey_state" => opp["journey_state"] || "forming",
      "participation_summary" => opp["participation_summary"],
      "surface" => "conversation_experience",
      "not_a_chat_participant" => true
    }

    case validate_shared_payload(shared) do
      :ok -> {:ok, shared}
      {:error, _} = err -> err
    end
  end

  def project_shared(_), do: {:error, :invalid_opportunity}

  def validate_shared_payload(payload) when is_map(payload) do
    blob =
      payload
      |> Jason.encode!()
      |> String.downcase()

    cond do
      bad = Enum.find(@forbidden_shared_substrings, &String.contains?(blob, &1)) ->
        {:error, {:private_leak, bad}}

      bad = Enum.find(@forbidden_shared_words, &contains_word?(blob, &1)) ->
        {:error, {:private_leak, bad}}

      true ->
        :ok
    end
  end

  def validate_shared_payload(_), do: {:error, :invalid_payload}

  def forbidden_substrings, do: @forbidden_shared_substrings ++ @forbidden_shared_words

  def sanitize_explanation(text) when is_binary(text) do
    lowered = String.downcase(text)

    leak? =
      Enum.any?(@forbidden_shared_substrings, &String.contains?(lowered, &1)) or
        Enum.any?(@forbidden_shared_words, &contains_word?(lowered, &1))

    if leak? do
      "Works with everyone’s timing and current preferences."
    else
      text
    end
  end

  def sanitize_explanation(_), do: "Works with everyone’s timing and current preferences."

  defp contains_word?(blob, word) do
    Regex.match?(~r/(^|[^a-z0-9])#{Regex.escape(word)}([^a-z0-9]|$)/, blob)
  end

  defp preferred_name(%{"display_name" => name}) when is_binary(name), do: name
  defp preferred_name(%{display_name: name}) when is_binary(name), do: name
  defp preferred_name(_), do: nil

  defp group_safe_see_why(%{"group_safe_explanation" => exp}) when is_binary(exp),
    do: sanitize_explanation(exp)

  defp group_safe_see_why(_),
    do: "Fits everyone’s current timing. Convenient for the people involved."

  defp public_option(opt) do
    opt = stringify(opt)

    %{
      "id" => opt["id"],
      "display_name" => opt["display_name"],
      "explanation" => sanitize_explanation(opt["group_safe_explanation"] || opt["explanation"])
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_value(v)}
      {k, v} -> {to_string(k), stringify_value(v)}
    end)
  end

  defp stringify_value(v) when is_map(v), do: stringify(v)
  defp stringify_value(v) when is_list(v), do: Enum.map(v, &stringify_value/1)
  defp stringify_value(v), do: v
end
