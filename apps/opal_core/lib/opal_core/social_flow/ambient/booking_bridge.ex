defmodule OpalCore.SocialFlow.Ambient.BookingBridge do
  @moduledoc """
  Bridge booking provider states → execution readiness.

  Social Set remains independent of provider truth.
  Never labels booked without provider confirmation.
  """

  alias OpalCore.SocialFlow.Ambient.ExecutionReadiness
  alias OpalCore.SocialFlow.Ambient.PaymentReadiness
  alias OpalCore.SocialFlow.RealWorld.Booking.ProviderBoundary

  @doc """
  Advance booking inquiry and map to execution readiness for a set plan.
  """
  def check_for_set(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with true <- a["set"] == true || {:error, :set_required},
         {:ok, inquiry} <-
           ProviderBoundary.inquire(%{
             venue_id: a["venue_id"],
             conversation_id: a["conversation_id"],
             time_window: a["time_window"],
             party_size: a["party_size"] || 2,
             provider: a["provider"]
           }),
         slots <-
           List.wrap(a["slots"] || [%{"id" => "s1", "label" => a["slot_label"] || "7:30"}]),
         {:ok, checked} <- ProviderBoundary.check_availability(inquiry, slots) do
      provider_ok? = checked["state"] == "availability_checked" and checked["booked"] != true
      provider_failed? = checked["state"] == "failed"

      {:ok, exec} =
        ExecutionReadiness.assess(%{
          "set" => true,
          "provider_checked" => true,
          "provider_available" => provider_ok?,
          "provider_failed" => provider_failed?,
          "slot_label" => a["slot_label"] || "7:30"
        })

      {:ok,
       %{
         "booking" => checked,
         "execution" => exec,
         "may_prompt_book" => exec["may_prompt_book"],
         "booked" => false,
         "social_truth_intact" => exec["social_truth_intact"],
         "provider_is_not_authority" => true,
         "authorizes_set" => false,
         "shared_safe_copy" => checked["shared_safe_summary"] || exec["shared_safe_copy"]
       }}
    end
  end

  def check_for_set(_), do: {:error, :invalid}

  @doc """
  After execution-ready + human auth: payment prompt then optional book.
  Does not charge without per-user auth.
  """
  def payment_then_book_gate(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, pay} <-
           PaymentReadiness.assess(%{
             "set" => true,
             "provider_checked" => true,
             "provider_available" => true,
             "participant_ids" => a["participant_ids"],
             "venue_id" => a["venue_id"],
             "price_each" => a["price_each"],
             "price_total" => a["price_total"],
             "all_agreed" => a["all_agreed"] != false,
             "user_authorized" => a["user_authorized"]
           }) do
      {:ok,
       %{
         "payment" => pay,
         "may_charge" => pay["payment_prompt_ok"] == false and a["user_authorized"] == true,
         "authorizes_charge" => false,
         "booked" => false
       }}
    end
  end

  def payment_then_book_gate(_), do: {:error, :invalid}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
