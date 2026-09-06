defmodule OpalCore.Events.Consumers.DecisionRecompositionBrodHandler do
  @moduledoc false
  # brod group subscriber callbacks — decode and forward to Recomposer path.

  alias OpalCore.Events.Consumers.DecisionRecompositionConsumer

  def init(_group_id, _args), do: {:ok, []}

  def handle_message(_topic, _partition, message, state) do
    value =
      case message do
        {:kafka_message, _offset, _key, val, _ts_type, _ts, _headers} -> val
        %{value: val} -> val
        _ -> nil
      end

    envelope =
      cond do
        is_binary(value) ->
          case Jason.decode(value) do
            {:ok, map} -> map
            _ -> nil
          end

        is_map(value) ->
          value

        true ->
          nil
      end

    if envelope, do: DecisionRecompositionConsumer.handle_envelope(envelope)
    {:ok, :commit, state}
  end
end
