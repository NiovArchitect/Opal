defmodule OpalCore.SocialFlow.Ambient.PaymentReadiness do
  @moduledoc """
  Payments only at the end of the funnel.

  Not a wallet product. Requires:
  participants + selected experience + price + provider state + human authority.

  Shared output: "Covered." — never individual payment details.
  Future AVP² concern; architecture only for now.
  """

  alias OpalCore.SocialFlow.Ambient.ExecutionReadiness

  @doc """
  Whether payment prompt is justified.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, exec} <- ExecutionReadiness.assess(a) do
      participants = List.wrap(a["participant_ids"] || a["in_ids"])
      price = a["price_each"] || a["price_total"]
      experience = a["experience_id"] || a["venue_id"] || a["event_id"]
      agreed? = a["all_agreed"] == true or a["set"] == true
      ready_exec? = exec["execution_ready"] == true

      can_prompt? =
        agreed? and ready_exec? and is_binary(experience) and not is_nil(price) and
          length(participants) >= 1 and a["user_authorized"] != true

      {:ok,
       %{
         "payment_prompt_ok" => can_prompt?,
         "funnel_position" => "end_only",
         "not_wallet_product" => true,
         "participants" => length(participants),
         "price_each" => a["price_each"],
         "price_total" => a["price_total"],
         "experience_id" => experience,
         "shared_safe_copy" =>
           if(can_prompt?,
             do: payment_copy(a),
             else: nil
           ),
         "after_pay_shared" => "Covered.",
         "individual_details_shared" => false,
         "authorizes_charge" => false,
         "requires_per_user_auth" => true,
         "execution" => exec
       }}
    end
  end

  def assess(_), do: {:ok, %{"payment_prompt_ok" => false}}

  @doc "Split suggestion — private per user; shared only Covered."
  def split(attrs) when is_map(attrs) do
    a = stringify(attrs)
    n = max(length(List.wrap(a["participant_ids"])), 1)
    total = to_f(a["price_total"] || 0)
    each = if total > 0, do: Float.round(total / n, 2), else: to_f(a["price_each"] || 0)

    {:ok,
     %{
       "each" => each,
       "count" => n,
       "shared_safe" => %{"status" => "pending", "no_amounts_by_person" => true},
       "private_amount_by_user" => true,
       "authorizes_charge" => false
     }}
  end

  def split(_), do: {:error, :invalid}

  defp payment_copy(a) do
    each = a["price_each"]
    if is_number(each), do: "$#{trunc(each)} each. Get them?", else: "Ready to cover this?"
  end

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
