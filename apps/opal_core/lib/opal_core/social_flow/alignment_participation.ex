defmodule OpalCore.SocialFlow.AlignmentParticipation do
  @moduledoc """
  Private participation responses for first alignment.

  Shared-safe projections never reveal private reasons.
  Private answers must not enter shared message history, shared socket events,
  push previews, or public metrics.
  """

  @shared_safe_responses %{
    "im_in" => nil,
    "maybe" => "Someone is still deciding.",
    "need_another_time" => "One person needs another time.",
    "not_this_time" => "This may not work for everyone.",
    "private" => "Someone answered privately."
  }

  @doc "Validate a private response key."
  def valid_response?(key) when is_binary(key) do
    Map.has_key?(@shared_safe_responses, key)
  end

  def valid_response?(_), do: false

  @doc """
  Shared-safe projection only. Never includes private reason text.
  """
  def shared_safe_projection(key) when is_binary(key) do
    case Map.fetch(@shared_safe_responses, key) do
      {:ok, nil} ->
        %{"kind" => "participation", "shared_safe" => true, "label" => "Someone is in"}

      {:ok, label} ->
        %{
          "kind" => "participation",
          "shared_safe" => true,
          "label" => label,
          "private_reason_hidden" => true
        }

      :error ->
        %{"kind" => "participation", "shared_safe" => true, "label" => "Someone answered"}
    end
  end

  def public_action_labels do
    [
      {"im_in", "I’m in"},
      {"maybe", "Maybe"},
      {"need_another_time", "Need another time"},
      {"not_this_time", "Not this time"},
      {"private", "Keep my answer private"}
    ]
  end
end
