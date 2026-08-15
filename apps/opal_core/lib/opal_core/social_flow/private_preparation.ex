defmodule OpalCore.SocialFlow.PrivatePreparation do
  @moduledoc """
  Leadership / stealth planning law (Pass 24).

  PRIVATE PREPARATION ≠ SHARED COMMITMENT.

  A planning leader may privately:
  - Curate / Extend / prepare surprise
  - select venue
  - review availability
  - sequence activities

  without sending every thought to peers.

  Selecting "surprise jazz after dinner" must NOT send
  "Want to go to jazz?" unless the user explicitly shares.

  Leadership is not control: hard no, accessibility, consent,
  hard availability cannot be overridden.
  """

  @doc """
  Classify an action as private prep vs shared commitment.

  actions: :select_place | :sequence_activity | :check_availability |
           :extend_select | :curate_accept | :share_place | :share_time |
           :send_message | :book_authorize | :invite
  """
  def classify(action) when is_atom(action) or is_binary(action) do
    case to_string(action) do
      a when a in ~w(select_place sequence_activity check_availability extend_select curate_accept prepare_surprise private_draft) ->
        :private_preparation

      a when a in ~w(share_place share_time send_message book_authorize invite explicit_share) ->
        :shared_commitment

      _ ->
        :unknown
    end
  end

  @doc "Does this action auto-message peers?"
  def auto_sends_to_peers?(action) do
    classify(action) == :shared_commitment
  end

  @doc """
  Leadership bounds — what a leader cannot override.
  """
  def cannot_override do
    [
      :hard_availability_no,
      :explicit_consent_no,
      :accessibility_constraint,
      :privacy_boundary,
      :block_safety,
      :payment_without_authority
    ]
  end

  def leadership_is_control?, do: false

  def private_prep_equals_shared?, do: false

  @doc """
  Simulate date-lead stealth plan.

  Returns whether any private step leaked a send.
  """
  def stealth_date_sequence(steps) when is_list(steps) do
    classified = Enum.map(steps, fn s -> {s, classify(s)} end)

    leaked =
      Enum.filter(classified, fn {s, c} ->
        c == :private_preparation and auto_sends_to_peers?(s)
      end)

    shared =
      Enum.filter(classified, fn {_s, c} -> c == :shared_commitment end)

    %{
      "steps" => length(steps),
      "private_steps" => Enum.count(classified, fn {_, c} -> c == :private_preparation end),
      "shared_steps" => length(shared),
      "leaks" => leaked,
      "leak_free" => leaked == [],
      "leadership_is_control" => false,
      "private_prep_equals_shared" => false
    }
  end

  def stealth_date_sequence(_), do: %{"leak_free" => false, "error" => true}
end
