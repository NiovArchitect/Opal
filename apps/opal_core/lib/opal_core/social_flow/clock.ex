defmodule OpalCore.SocialFlow.Clock do
  @moduledoc """
  Small injectable server clock for temporal follow-through.

  Production: DateTime.utc_now/0.
  Tests: put a frozen instant via `freeze/1` / `unfreeze/0` (process-local)
  or Application config `:opal_core, OpalCore.SocialFlow.Clock, now: fun`.

  Client clocks are never authority for durable deadline evaluation.
  """

  @process_key :opal_social_flow_clock_now

  @doc "Canonical UTC now for scheduler / temporal evaluation."
  def utc_now do
    cond do
      match?(%DateTime{}, Process.get(@process_key)) ->
        Process.get(@process_key)

      is_function(config_now(), 0) ->
        config_now().()

      true ->
        DateTime.utc_now() |> DateTime.truncate(:microsecond)
    end
  end

  @doc "Freeze clock in the current process (tests)."
  def freeze(%DateTime{} = dt) do
    Process.put(@process_key, DateTime.truncate(dt, :microsecond))
    :ok
  end

  def freeze(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> freeze(dt)
      _ -> {:error, :invalid_datetime}
    end
  end

  @doc "Clear process freeze."
  def unfreeze do
    Process.delete(@process_key)
    :ok
  end

  @doc "Advance frozen clock by seconds (tests)."
  def advance(seconds) when is_integer(seconds) do
    case Process.get(@process_key) do
      %DateTime{} = dt ->
        freeze(DateTime.add(dt, seconds, :second))

      _ ->
        {:error, :not_frozen}
    end
  end

  defp config_now do
    Application.get_env(:opal_core, __MODULE__, [])[:now]
  end
end
