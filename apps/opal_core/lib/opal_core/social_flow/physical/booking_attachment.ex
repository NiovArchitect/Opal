defmodule OpalCore.SocialFlow.Physical.BookingAttachment do
  @moduledoc """
  Booking belongs to native Opal commitment/plan lineage.

  Provider does not own social plan.
  Strict states; never "booked" without provider confirmation.
  """

  alias OpalCore.SocialFlow.RealWorld.Booking.Executor, as: BookingExecutor

  @doc """
  Attach a booking attempt to an existing commitment.

  Requires user authorization for external action.
  """
  def book_for_commitment(commitment, attrs) when is_map(commitment) and is_map(attrs) do
    c = stringify(commitment)
    a = stringify(attrs)

    cond do
      a["user_authorized"] != true ->
        {:error, :user_authorization_required}

      is_nil(c["id"]) and is_nil(c["shared_plan_id"]) ->
        {:error, :commitment_required}

      true ->
        case BookingExecutor.book_aligned(%{
               venue_id: a["venue_id"],
               conversation_id: c["conversation_id"] || a["conversation_id"],
               user_authorized: true,
               slot_label: a["slot_label"] || "7:30",
               category: a["category"] || "dinner",
               quiet_only: a["quiet_only"] == true,
               provider_confirms: a["provider_confirms"] != false
             }) do
          {:ok, result} ->
            booking = result["booking"] || %{}

            {:ok,
             %{
               "commitment_id" => c["id"],
               "shared_plan_id" => c["shared_plan_id"],
               "booking" => booking,
               "lineage_preserved" => true,
               "provider_owns_plan" => false,
               "recovery" => result["recovery"],
               "authorizes_set" => false
             }}

          err ->
            err
        end
    end
  end

  def book_for_commitment(_, _), do: {:error, :invalid}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
