defmodule OpalCoreWeb.VoiceController do
  @moduledoc """
  Paste G Phase 10 — TTS speak + listen honesty + signed audio share.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Voice
  alias OpalCore.Voice.AudioStore

  @doc "POST /api/v1/product/voice/speak — approved text → audio (+ optional deliver)."
  def speak(conn, params) do
    user_id = conn.assigns.current_user_id

    attrs =
      params
      |> Map.put("account_id", user_id)
      |> Map.put("sender_user_id", user_id)

    opts = [allow_test_stub: params["allow_test_stub"] in [true, "true"] and Mix.env() == :test]

    case Voice.speak(attrs, opts) do
      {:ok, result} ->
        conn |> put_status(:created) |> json(stringify(result))

      {:disabled, reason} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{"error" => "disabled", "message" => reason})

      {:error, :approval_required} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          "error" => "approval_required",
          "message" => "Approve the exact text before Opal speaks it."
        })

      {:error, {:prompt_injection, reason}} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{"error" => "prompt_injection", "reason" => to_string(reason)})

      {:error, {:approval_quote_back, safe_text}} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          "error" => "approval_quote_back",
          "message" => "Confirm you want Opal to speak exactly this:",
          "text" => safe_text
        })

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{"error" => error_string(reason)})
    end
  end

  @doc "GET /api/v1/product/voice/listen — honesty gate for inbound voice notes."
  def listen(conn, _params) do
    case Voice.listen(%{}) do
      {:ok, :ready} ->
        json(conn, %{"status" => "ready"})

      {:disabled, message} ->
        json(conn, %{"status" => "disabled", "message" => message})
    end
  end

  @doc "GET /share/voice-audio/:token — signed TTS audio bytes."
  def show_audio(conn, %{"token" => token}) do
    with {:ok, key, mime} <- AudioStore.verify_token(token),
         {:ok, bin} <- AudioStore.read(key) do
      conn
      |> put_resp_header("x-robots-tag", "noindex, nofollow")
      |> put_resp_header("cache-control", "private, max-age=3600")
      |> put_resp_content_type(mime)
      |> send_resp(200, bin)
    else
      _ ->
        conn
        |> put_resp_header("x-robots-tag", "noindex, nofollow")
        |> send_resp(404, "not found")
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify(v)}
      {k, v} -> {to_string(k), stringify(v)}
    end)
  end

  defp stringify(%_{} = struct), do: stringify(Map.from_struct(struct))
  defp stringify(list) when is_list(list), do: Enum.map(list, &stringify/1)
  defp stringify(other), do: other

  defp error_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp error_string(reason) when is_binary(reason), do: reason
  defp error_string(reason), do: inspect(reason)
end
