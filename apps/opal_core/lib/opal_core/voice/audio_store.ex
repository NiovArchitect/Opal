defmodule OpalCore.Voice.AudioStore do
  @moduledoc """
  Local/priv storage for generated TTS audio (Paste G Phase 10).

  Writes under `priv/local_media/voice/`. Public access via signed expiring
  share route `GET /share/voice-audio/:token` (Phoenix.Token).
  """

  alias OpalCore.PublicBaseUrl

  @salt "opal-voice-audio"
  # 7 days
  @ttl_sec 7 * 24 * 3600
  @max_bytes 5 * 1024 * 1024

  def root_dir do
    base =
      Application.get_env(:opal_core, :local_media_root) ||
        Path.join(:code.priv_dir(:opal_core) |> List.to_string(), "local_media")

    Path.join(base, "voice")
  end

  @doc "Persist audio binary. Returns storage metadata map."
  def put(owner_id, binary, meta \\ %{})

  def put(owner_id, binary, meta)
      when is_binary(owner_id) and is_binary(binary) do
    mime = meta[:content_type] || meta["content_type"] || "audio/mpeg"

    cond do
      byte_size(binary) == 0 ->
        {:error, :empty_audio}

      byte_size(binary) > @max_bytes ->
        {:error, :too_large}

      true ->
        File.mkdir_p!(root_dir())
        owner = sanitize(owner_id)
        relative = "#{owner}/#{Ecto.UUID.generate()}.#{ext(mime)}"
        path = Path.join(root_dir(), relative)
        File.mkdir_p!(Path.dirname(path))
        File.write!(path, binary)

        {:ok,
         %{
           "storage_backend" => "local_dev",
           "storage_key" => "voice/#{relative}",
           "mime_type" => mime,
           "byte_size" => byte_size(binary),
           "provider" => meta[:provider] || meta["provider"]
         }}
    end
  end

  def put(_, _, _), do: {:error, :invalid}

  def read(storage_key) when is_binary(storage_key) do
    case File.read(path_for(storage_key)) do
      {:ok, bin} -> {:ok, bin}
      {:error, _} -> {:error, :not_found}
    end
  end

  def read(_), do: {:error, :not_found}

  @doc "Signed expiring URL path (relative) for a stored audio object."
  def public_path(%{"storage_key" => key} = stored) when is_binary(key) do
    token =
      Phoenix.Token.sign(OpalCoreWeb.Endpoint, @salt, %{
        "k" => key,
        "m" => stored["mime_type"] || "audio/mpeg"
      })

    "/share/voice-audio/#{URI.encode_www_form(token)}"
  end

  def public_path(_), do: "/share/voice-audio"

  @doc "Absolute share URL (for API responses)."
  def public_url(stored) do
    path = public_path(stored)

    if String.starts_with?(path, "http"), do: path, else: PublicBaseUrl.url(path)
  end

  @doc "Verify share token → {:ok, storage_key, mime} | {:error, reason}."
  def verify_token(token) when is_binary(token) do
    case Phoenix.Token.verify(OpalCoreWeb.Endpoint, @salt, token, max_age: @ttl_sec) do
      {:ok, %{"k" => key} = payload} when is_binary(key) ->
        {:ok, key, payload["m"] || "audio/mpeg"}

      {:ok, _} ->
        {:error, :invalid}

      {:error, _} = err ->
        err
    end
  end

  def verify_token(_), do: {:error, :invalid}

  defp path_for("voice/" <> rest), do: Path.join(root_dir(), rest)
  defp path_for(key), do: Path.join(root_dir(), key)

  defp ext("audio/wav"), do: "wav"
  defp ext("audio/webm"), do: "webm"
  defp ext("audio/ogg"), do: "ogg"
  defp ext(_), do: "mp3"

  defp sanitize(id) do
    id
    |> String.replace(~r/[^a-zA-Z0-9_-]/, "")
    |> String.slice(0, 64)
    |> case do
      "" -> "anon"
      s -> s
    end
  end
end
