defmodule OpalCore.SocialFlow.RateLimitBucket do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "rate_limit_buckets" do
    field :bucket_key, :string
    field :action, :string
    field :count, :integer, default: 0
    field :window_started_at, :utc_datetime_usec
    field :blocked_until, :utc_datetime_usec
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(b, attrs) do
    b
    |> cast(attrs, [
      :bucket_key,
      :action,
      :count,
      :window_started_at,
      :blocked_until
    ])
    |> validate_required([:bucket_key, :action, :count, :window_started_at])
  end
end
