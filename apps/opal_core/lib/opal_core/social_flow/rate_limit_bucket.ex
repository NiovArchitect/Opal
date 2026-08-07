defmodule OpalCore.SocialFlow.RateLimitBucket do
  @moduledoc """
  Shared rate-limit buckets with atomic check-and-increment.

  Uses a single DB transaction + row lock (`FOR UPDATE`) so concurrent requests
  cannot both pass a threshold before either increment is visible.
  """

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias OpalCore.Repo

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
    |> unique_constraint([:bucket_key, :action],
      name: :rate_limit_buckets_bucket_key_action_index
    )
  end

  @doc """
  Atomically check and record one hit for `{bucket_key, action}`.

  Returns `:ok` or `{:error, :rate_limited}`.
  """
  def hit(bucket_key, action, opts \\ [])
      when is_binary(bucket_key) and is_binary(action) do
    max = Keyword.get(opts, :max, 5)
    window_sec = Keyword.get(opts, :window_sec, 300)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    case Repo.transaction(fn -> do_hit(bucket_key, action, max, window_sec, now) end) do
      {:ok, :ok} -> :ok
      {:ok, {:error, :rate_limited}} -> {:error, :rate_limited}
      {:error, :rate_limited} -> {:error, :rate_limited}
      {:error, _} -> {:error, :rate_limited}
    end
  end

  defp do_hit(bucket_key, action, max, window_sec, now) do
    b =
      from(r in __MODULE__,
        where: r.bucket_key == ^bucket_key and r.action == ^action,
        lock: "FOR UPDATE"
      )
      |> Repo.one()

    case b do
      nil ->
        insert_first_hit(bucket_key, action, max, window_sec, now)

      %__MODULE__{} = row ->
        update_hit(row, max, window_sec, now)
    end
  end

  defp insert_first_hit(bucket_key, action, max, window_sec, now) do
    cs =
      %__MODULE__{}
      |> changeset(%{
        bucket_key: bucket_key,
        action: action,
        count: 1,
        window_started_at: now
      })

    case Repo.insert(cs) do
      {:ok, _} ->
        :ok

      {:error, %Ecto.Changeset{}} ->
        # Unique race: peer inserted first — re-lock and continue under same limits.
        from(r in __MODULE__,
          where: r.bucket_key == ^bucket_key and r.action == ^action,
          lock: "FOR UPDATE"
        )
        |> Repo.one()
        |> case do
          nil -> Repo.rollback(:rate_limited)
          row -> update_hit(row, max, window_sec, now)
        end
    end
  end

  defp update_hit(b, max, window_sec, now) do
    if b.blocked_until && DateTime.compare(now, b.blocked_until) == :lt do
      Repo.rollback(:rate_limited)
    else
      window_expired? = DateTime.diff(now, b.window_started_at, :second) > window_sec

      {count, started} =
        if window_expired?, do: {1, now}, else: {b.count + 1, b.window_started_at}

      if count > max do
        blocked = DateTime.add(now, window_sec, :second)

        b
        |> changeset(%{
          count: count,
          window_started_at: started,
          blocked_until: blocked
        })
        |> Repo.update!()

        Repo.rollback(:rate_limited)
      else
        b
        |> changeset(%{
          count: count,
          window_started_at: started,
          blocked_until: nil
        })
        |> Repo.update!()

        :ok
      end
    end
  end
end
