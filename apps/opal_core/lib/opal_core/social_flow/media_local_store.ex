defmodule OpalCore.SocialFlow.MediaLocalStore do
  @moduledoc """
  Local-development media storage for Social Moments (Pass 17).

  Status: LOCAL_DEV — not a production CDN.
  Strips EXIF/GPS by not preserving raw EXIF blobs (write only image bytes).
  """

  @max_bytes 8 * 1024 * 1024
  @allowed_mimes ~w(image/jpeg image/png image/webp image/gif)

  def status, do: "LOCAL_DEV"
  def production_cdn?, do: false
  def max_bytes, do: @max_bytes
  def allowed_mimes, do: @allowed_mimes

  def root_dir do
    Application.get_env(:opal_core, :local_media_root) ||
      Path.join(:code.priv_dir(:opal_core) |> List.to_string(), "local_media")
  end

  @doc """
  Persist base64 or raw binary image. Returns storage_key + metadata.
  EXIF/GPS: not preserved as separate metadata; only raw bytes written.
  """
  def put_image(owner_user_id, %{binary: bin, mime_type: mime})
      when is_binary(owner_user_id) and is_binary(bin) do
    mime = mime || "image/jpeg"

    cond do
      mime not in @allowed_mimes ->
        {:error, :unsupported_mime}

      byte_size(bin) > @max_bytes ->
        {:error, :too_large}

      byte_size(bin) < 32 ->
        {:error, :too_small}

      true ->
        File.mkdir_p!(root_dir())
        key = "u/#{owner_user_id}/#{Ecto.UUID.generate()}.#{ext(mime)}"
        path = Path.join(root_dir(), key)
        File.mkdir_p!(Path.dirname(path))
        # Write image bytes only — no EXIF sidecar, no GPS fields retained as product data
        File.write!(path, bin)

        {:ok,
         %{
           "storage_backend" => "local_dev",
           "storage_key" => key,
           "mime_type" => mime,
           "byte_size" => byte_size(bin),
           "exif_stripped" => true,
           "cdn_status" => "LOCAL_DEV",
           "processing_state" => "ready"
         }}
    end
  end

  def put_image(owner_user_id, %{base64: b64, mime_type: mime}) when is_binary(b64) do
    cleaned = b64 |> String.replace(~r/^data:[^;]+;base64,/, "") |> String.trim()

    case Base.decode64(cleaned) do
      {:ok, bin} -> put_image(owner_user_id, %{binary: bin, mime_type: mime})
      :error -> {:error, :invalid_base64}
    end
  end

  def put_image(_, _), do: {:error, :invalid}

  def read(storage_key) when is_binary(storage_key) do
    path = Path.join(root_dir(), storage_key)

    case File.read(path) do
      {:ok, bin} -> {:ok, bin}
      {:error, _} -> {:error, :not_found}
    end
  end

  def delete(storage_key) when is_binary(storage_key) do
    path = Path.join(root_dir(), storage_key)
    _ = File.rm(path)
    :ok
  end

  def delete(_), do: :ok

  defp ext("image/png"), do: "png"
  defp ext("image/webp"), do: "webp"
  defp ext("image/gif"), do: "gif"
  defp ext(_), do: "jpg"
end
