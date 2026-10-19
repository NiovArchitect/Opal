defmodule OpalCore.IdShape do
  @moduledoc """
  Shape guard for ids that address `:binary_id` rows (Repair #18
  apifix, FR-11-08).

  `Repo.get/2` and Ecto queries raise `Ecto.Query.CastError` when a
  junk id ("nil", "not-a-uuid", "12345") is cast against a binary_id
  field, so any public entry point that feeds a raw path id into a
  lookup without a shape check answers a 500 with raw exception
  internals. The product contract is an honest 4xx: a junk id is a
  guessed id, and a guessed id is simply not found. Entry points
  guard with `uuid?/1` before any query runs (the
  `SocialFlow.get_plan_for_user/2` precedent, Repair #16 W1).
  """

  @doc "True when `id` is a binary that casts as a UUID."
  def uuid?(id) when is_binary(id), do: match?({:ok, _}, Ecto.UUID.cast(id))
  def uuid?(_), do: false
end
