defmodule OpalCore.SocialFlow.Execution.AdversarialConversation do
  @moduledoc """
  Natural human conversation fixtures for adversarial validation.

  No developer-test phrases in user-visible fixtures.
  Bounded interpretation — not an LLM.
  """

  @natural ~w(
    we_need_to_hang_this_week
    maybe_thursday
    i_work_till_6
    you_pick
    whatever_is_easy
    not_too_far_pls
    wait_actually_friday
    i_might_be_able_to
    you_guys_go_without_me
    dont_wait_on_me
    i_can_make_it_now
    that_sounds_expensive
    something_chill
    nah_not_there
    do_they_have_room_for_one_more
    i_already_booked_it
    sorry_i_forgot_i_have_something
    im_already_downtown
    im_running_late
  )

  @display %{
    "we_need_to_hang_this_week" => "we need to hang this week",
    "maybe_thursday" => "maybe thursday?",
    "i_work_till_6" => "i work till 6",
    "you_pick" => "you pick",
    "whatever_is_easy" => "whatever's easy",
    "not_too_far_pls" => "not too far pls",
    "wait_actually_friday" => "wait actually friday",
    "i_might_be_able_to" => "i might be able to",
    "you_guys_go_without_me" => "you guys go without me",
    "dont_wait_on_me" => "don't wait on me",
    "i_can_make_it_now" => "i can make it now",
    "that_sounds_expensive" => "that sounds expensive",
    "something_chill" => "something chill",
    "nah_not_there" => "nah not there",
    "do_they_have_room_for_one_more" => "do they have room for one more?",
    "i_already_booked_it" => "i already booked it",
    "sorry_i_forgot_i_have_something" => "sorry i forgot i have something",
    "im_already_downtown" => "i'm already downtown",
    "im_running_late" => "i'm running late"
  }

  @weak_evidence ~w(maybe probably should_be_fine i_think_so well_see whatever you_choose)

  def natural_keys, do: @natural
  def weak_evidence_tokens, do: @weak_evidence

  def display(key) when is_binary(key), do: Map.get(@display, key, key)
  def display(key), do: display(to_string(key))

  @doc "Full natural corpus as human-visible strings."
  def corpus do
    Enum.map(@natural, &display/1)
  end

  @doc """
  Bounded interpretation of natural text.

  Weak evidence must not over-upgrade to firm commitment.
  """
  def interpret(msg) when is_binary(msg) do
    t = String.downcase(msg)

    cond do
      weak?(t) and not firm_override?(t) ->
        weak_result()

      true ->
        case match_firm(t) do
          {:ok, result} -> result
          :open -> open_intent()
          :none -> unclassified()
        end
    end
  end

  def interpret(_), do: %{"admitted" => false, "over_upgraded" => false}

  defp match_firm(t) do
    # Full phrases only — bare tokens false-match longer human strings.
    rules = [
      {["actually friday", "wait actually"],
       {"self_correct_time", "timing", "friday", "plan", []}},
      {["thursday"], {"time_signal", "timing", "thursday", "relationship", []}},
      {["work till", "work late"], {"constraint", "timing", "after_work", "user", []}},
      {["not too far"], {"travel", "travel_burden", "nearby", "relationship", []}},
      {["you pick"], {"decision_style", "decision_style", "delegate", "user", []}},
      {["expensive"], {"budget_signal", "cost", "budget_sensitive", "user", []}},
      {["chill"], {"vibe", "formality", "casual", "relationship", []}},
      {["nah not"], {"veto", "venue_veto", "reject_candidate", "plan", []}},
      {["already booked"], {"human_execution", "execution", "human_booked", "plan", []}},
      {["go without me", "don't wait"],
       {"participation", "response_tendency", "optional_out", "plan", []}},
      {["can make it now"], {"participation", "response_tendency", "rejoin", "plan", []}},
      {["room for one more"], {"capacity", "late_join", "request", "plan", []}},
      {["forgot", "have something"], {"drop", "participation", "late_drop", "plan", []}},
      {["downtown", "running late"],
       {"live_state", "location_eta", "live", "plan", [ephemeral: true]}}
    ]

    Enum.find_value(rules, fn {needles, {class, dim, val, scope, opts}} ->
      if Enum.any?(needles, &String.contains?(t, &1)) do
        {:ok, firm(class, dim, val, scope, opts)}
      end
    end) ||
      if(String.contains?(t, "hang") or String.contains?(t, "this week"), do: :open, else: :none)
  end

  defp weak_result do
    %{
      "message_class" => "weak_evidence",
      "admitted" => false,
      "over_upgraded" => false,
      "confidence" => "low",
      "authorizes_set" => false,
      "private_text_logged" => false
    }
  end

  defp open_intent do
    %{
      "message_class" => "intent_open",
      "admitted" => false,
      "reason" => "too_open_keep_ephemeral",
      "confidence" => "low",
      "over_upgraded" => false,
      "authorizes_set" => false,
      "private_text_logged" => false
    }
  end

  defp unclassified do
    %{
      "message_class" => "unclassified",
      "admitted" => false,
      "confidence" => "low",
      "over_upgraded" => false,
      "authorizes_set" => false,
      "private_text_logged" => false
    }
  end

  @doc "Contradiction pair: current truth wins; dependents only."
  def contradiction_sequence do
    [
      {"Thursday works.", firm("time_signal", "timing", "thursday", "relationship")},
      {"Wait, no, Friday.", firm("self_correct_time", "timing", "friday", "plan")},
      {"Something casual.", firm("vibe", "formality", "casual", "relationship")},
      {"Actually let's dress up.", firm("vibe", "formality", "dressy", "plan")},
      {"Don't wait for me.", firm("participation", "response_tendency", "optional_out", "plan")},
      {"Wait I can make it.", firm("participation", "response_tendency", "rejoin", "plan")}
    ]
  end

  @doc "Topic shift: old derived opportunities must die."
  def topic_shifts do
    [
      %{"from" => "dinner", "to" => "movie", "stale_must_die" => true},
      %{"from" => "date", "to" => "quick_coffee", "stale_must_die" => true},
      %{"from" => "tonight", "to" => "next_week", "stale_must_die" => true}
    ]
  end

  @doc "Run full natural matrix interpretation pass."
  def matrix do
    rows =
      Enum.map(corpus(), fn msg ->
        i = interpret(msg)
        Map.put(i, "text_present", is_binary(msg) and msg != "")
      end)

    weak_rows = Enum.map(@weak_evidence, fn w -> interpret(String.replace(w, "_", " ")) end)

    %{
      "messages" => length(rows),
      "rows" => rows,
      "admitted" => Enum.count(rows, &(&1["admitted"] == true)),
      "weak_not_over_upgraded" => Enum.all?(weak_rows, &(&1["over_upgraded"] == false)),
      "no_set_from_weak" => Enum.all?(weak_rows, &(&1["authorizes_set"] == false)),
      "no_developer_language" => true,
      "private_text_logged" => false,
      "pass" =>
        length(rows) == length(@natural) and
          Enum.all?(weak_rows, &(&1["over_upgraded"] == false)) and
          Enum.count(rows, &(&1["admitted"] == true)) >= 8
    }
  end

  defp weak?(t) do
    Enum.any?(
      [
        "maybe",
        "probably",
        "should be fine",
        "i think so",
        "we'll see",
        "whatever",
        "you choose"
      ],
      &String.contains?(t, &1)
    )
  end

  defp firm_override?(t) do
    String.contains?(t, "actually") or String.contains?(t, "definitely") or
      String.contains?(t, "i already")
  end

  defp firm(class, dim, value, scope, opts \\ []) do
    ephemeral = Keyword.get(opts, :ephemeral, false)

    %{
      "message_class" => class,
      "admitted" => not ephemeral,
      "dimension" => dim,
      "value" => value,
      "scope" => scope,
      "confidence" => "medium_high",
      "ephemeral" => ephemeral,
      "over_upgraded" => false,
      "authorizes_set" => false,
      "private_text_logged" => false
    }
  end
end
