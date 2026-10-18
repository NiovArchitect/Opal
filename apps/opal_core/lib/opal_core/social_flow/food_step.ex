defmodule OpalCore.SocialFlow.FoodStep do
  @moduledoc """
  Repair #18 (Division B, Track B2) — pure state helpers for the at-home
  food step. No Repo writes of its own: PlanCompletion persists the step
  inside the one completion map on the authoritative plan row, and the
  food actions in SocialFlow mutate that same map under the plan's
  participant gate. One writer path, one store (gyroscope rule).

  HONESTY LAW (design track-b2-home-completion.md §3.4): there is NO
  recipient state, step status, field, or boolean named or valued
  `ordered`, `placed`, `confirmed_by_provider`, `provider_confirmed`,
  `delivery_status`, `eta`, `tracking`, or `order_number`, and no field
  that could hold a confirmation number, an order total, or a delivery
  estimate. `self_confirmed_done` means exactly one thing: that person
  tapped "I placed my order" in Opal AFTER their own handoff. It is a
  human self-report, never produced by a timer, a return-to-app event,
  a deep-link callback, or another person.

  Addresses: B2 collects, stores, transmits, and displays NO address of
  any kind. The delivery address lives only inside each person's own
  provider account (§4.2). `household_key` comes ONLY from explicit
  per-plan user declaration and defaults to one household per person;
  it is never inferred and never projected across participants.
  """

  @meal_words ~w(dinner lunch brunch breakfast supper meal)
  @question_words ~w(sort handle arrange organize organise can could would)

  @banned_claim_strings [
    "order placed",
    "order confirmed",
    "confirmed order",
    "booking confirmed",
    "on its way",
    "out for delivery",
    "arriving at",
    "we ordered",
    "opal ordered",
    "food is handled"
  ]

  @doc "Canonical strings (§5.2) and state names audited against this list."
  def banned_claim_strings, do: @banned_claim_strings

  @doc "True when `text` contains a banned provider-claim phrase."
  def banned_claim?(text) when is_binary(text) do
    down = String.downcase(text)

    Enum.any?(@banned_claim_strings, &String.contains?(down, &1)) or
      Regex.match?(~r/\border\s*#/, down) or Regex.match?(~r/\beta\b/, down)
  end

  def banned_claim?(_), do: false

  @doc """
  Trigger detection (§2.2) from the plan's own held data — the alignment
  food flag the intent/create paths stamp, plus the title text.

    * `:explicit` — a food signal was carried for this virtual plan
      (alignment `food_at_home` true, or the title itself combines a meal
      word with an ordering word: "order in", "food delivered", ...).
    * `:question` — the signal was phrased as a question ("can Opal sort
      food..."): the step is `suggested` and is accepted in-turn only.
    * `:meal_shaped` — title/what is meal-shaped with no explicit signal:
      Trigger B, one ask (`suggested`).
    * `:none` — work-shaped or non-meal virtual plan: NO food step.
  """
  def trigger(plan) do
    alignment = plan_alignment(plan)
    title = String.downcase(to_string(Map.get(plan, :title) || ""))
    flag = alignment["food_at_home"]

    cond do
      flag == true and alignment["food_question"] == true -> :question
      flag == true -> :explicit
      explicit_in_text?(title) -> :explicit
      question_in_text?(title) -> :question
      meal_shaped?(title) -> :meal_shaped
      true -> :none
    end
  end

  defp explicit_in_text?(text) do
    has_meal = Enum.any?(@meal_words ++ ["food"], &word?(text, &1))
    has_signal = Enum.any?(["order", "delivered", "delivery", "takeout"], &word?(text, &1))
    has_meal and has_signal
  end

  defp question_in_text?(text) do
    String.contains?(text, "sort food") or
      (Enum.any?(@question_words, &word?(text, &1)) and word?(text, "food") and
         (String.contains?(text, "?") or String.contains?(text, "sort")))
  end

  @doc "Meal-shaped title/what (Trigger B scope)."
  def meal_shaped?(text) when is_binary(text) do
    down = String.downcase(text)
    Enum.any?(@meal_words, &word?(down, &1))
  end

  def meal_shaped?(_), do: false

  defp word?(text, word), do: Regex.match?(~r/\b#{Regex.escape(word)}\b/, text)

  @doc """
  Build fresh recipient entries — one per participant user id, each in
  their own default household (`"self:<user_id>"`, an opaque per-plan
  key that is never projected across participants).
  """
  def new_recipients(user_ids) do
    user_ids
    |> Enum.uniq()
    |> Enum.map(fn uid ->
      %{
        "user_id" => uid,
        "household_key" => "self:" <> uid,
        "items" => [],
        "items_state" => "none",
        "handoff_state" => "not_started",
        "provider_choice" => nil,
        "handed_off_at" => nil,
        "self_confirmed_at" => nil,
        "alternate_restaurant" => nil
      }
    end)
  end

  @doc """
  Merge prior recipient entries (from the previous completion record)
  with the plan's current participants: existing per-person state is
  preserved verbatim across re-drives; new participants get fresh
  entries; departed participants are dropped.
  """
  def merge_recipients(prior, user_ids) do
    prior_by_id = Map.new(prior || [], fn r -> {r["user_id"], r} end)

    user_ids
    |> Enum.uniq()
    |> Enum.map(fn uid -> Map.get(prior_by_id, uid) || hd(new_recipients([uid])) end)
  end

  @doc """
  Derive the step-level status from recipient entries (§3.4). The base
  status is the composition status (`suggested` / `declined` /
  `composing` / `composed` / `unavailable_no_rail`); derivation only ever
  PROMOTES from `composed` on the strength of recipient facts:
  any handoff begun -> `handed_off`; every active recipient either
  self-confirmed or explicitly not ordering -> `self_confirmed`.
  """
  def derive_status(base, recipients) do
    cond do
      base in ["suggested", "declined", "unavailable_no_rail", "skipped_past", "failed"] ->
        base

      recipients == [] ->
        base

      true ->
        active = Enum.reject(recipients, &(&1["handoff_state"] == "not_ordering"))

        cond do
          active != [] &&
              Enum.all?(active, &(&1["handoff_state"] == "self_confirmed_done")) ->
            "self_confirmed"

          Enum.any?(
            recipients,
            &(&1["handoff_state"] in ["handed_off", "self_confirmed_done", "could_not_deliver"])
          ) ->
            if base in ["composed", "handed_off", "self_confirmed"], do: "handed_off", else: base

          true ->
            base
        end
    end
  end

  @doc """
  Household rollup (§3.5): counts only, attributed form. Households are
  the distinct declared household keys; a household counts as confirmed
  when every active member of it self-confirmed (or opted out is NOT a
  confirmation — opted-out households drop out of the denominator).
  """
  def rollup(recipients, names \\ %{}) do
    households =
      recipients
      |> Enum.reject(&(&1["handoff_state"] == "not_ordering"))
      |> Enum.group_by(& &1["household_key"])

    total = map_size(households)

    confirmed_households =
      Enum.count(households, fn {_k, members} ->
        Enum.all?(members, &(&1["handoff_state"] == "self_confirmed_done"))
      end)

    confirmed_names =
      recipients
      |> Enum.filter(&(&1["handoff_state"] == "self_confirmed_done"))
      |> Enum.map(fn r -> names[r["user_id"]] || "Someone" end)

    label =
      cond do
        length(recipients) <= 1 ->
          "Your order list is ready - you place the order with the provider"

        total == 0 ->
          "No one is ordering for this one"

        confirmed_households == total ->
          "#{total} of #{total} households confirmed their own orders"

        true ->
          "#{confirmed_households} of #{total} households confirmed their own orders · " <>
            "#{total - confirmed_households} of #{total} households still to order"
      end

    %{
      "households_total" => total,
      "households_confirmed" => confirmed_households,
      "confirmed_by" => confirmed_names,
      "label" => label
    }
  end

  @doc "The recipient entry for one user, or nil."
  def recipient(step, user_id) do
    Enum.find(step["recipients"] || [], &(&1["user_id"] == user_id))
  end

  @doc "Replace one recipient entry inside the step map."
  def put_recipient(step, entry) do
    recipients =
      Enum.map(step["recipients"] || [], fn r ->
        if r["user_id"] == entry["user_id"], do: entry, else: r
      end)

    %{step | "recipients" => recipients}
  end

  defp plan_alignment(plan), do: Map.get(plan, :alignment) || %{}
end
