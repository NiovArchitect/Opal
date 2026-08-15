defmodule OpalCore.SocialFlow.SocialMomentMedia do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "social_moment_media" do
    field :storage_backend, :string, default: "local_dev"
    field :storage_key, :string
    field :mime_type, :string, default: "image/jpeg"
    field :byte_size, :integer, default: 0
    field :width, :integer
    field :height, :integer
    field :processing_state, :string, default: "ready"
    field :moderation_state, :string, default: "active"
    field :exif_stripped, :boolean, default: true
    field :deleted_at, :utc_datetime_usec
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :owner_user_id,
      :storage_backend,
      :storage_key,
      :mime_type,
      :byte_size,
      :width,
      :height,
      :processing_state,
      :moderation_state,
      :exif_stripped,
      :deleted_at
    ])
    |> validate_required([:owner_user_id, :storage_backend, :storage_key, :mime_type])
    |> validate_inclusion(:storage_backend, ~w(local_dev recorded stub s3 r2))
    |> validate_inclusion(:processing_state, ~w(pending ready failed))
    |> validate_inclusion(:moderation_state, ~w(pending active restricted removed))
    |> unique_constraint(:storage_key)
  end

  def contract(%__MODULE__{} = m) do
    %{
      "id" => m.id,
      "mime_type" => m.mime_type,
      "byte_size" => m.byte_size,
      "width" => m.width,
      "height" => m.height,
      "processing_state" => m.processing_state,
      "moderation_state" => m.moderation_state,
      "storage_backend" => m.storage_backend,
      "exif_stripped" => m.exif_stripped == true,
      "cdn_status" => if(m.storage_backend == "local_dev", do: "LOCAL_DEV", else: m.storage_backend)
    }
  end
end
