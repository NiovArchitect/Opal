defmodule OpalCore.Invites.PersonalCodes do
  @moduledoc """
  Personal invite codes (spec 4.C4) on the existing invite system.

  The existing `OpalCore.Invites` codes are single-use (a code's
  status flips to "joined" and can never redeem again). A personal
  code is the durable form the spec names: one code per account,
  redeemed by many people, each redemption a real linking record
  that also creates the friend relationship both ways - the same
  linking `Invites.mark_joined/2` performs.

  Guards: self-redeem refused; double-redeem refused (one record per
  person per code); redemptions per account per day are rate-limited
  at the same 10/day the invite system uses for creation. Copy law:
  the connection is the whole promise - no reward is defined or
  implied anywhere in this module's contracts.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Invites
  alias OpalCore.Invites.InviteRedemption
  alias OpalCore.Invites.PersonalCode
  alias OpalCore.Relationships
  alias OpalCore.Repo

  @daily_redemption_limit 10
  @max_code_attempts 5

  @doc "The account's personal code, created on first ask (idempotent)."
  def get_or_create_code(user_id) when is_binary(user_id) do
    case Repo.get_by(PersonalCode, user_id: user_id) do
      %PersonalCode{} = row ->
        {:ok, row}

      nil ->
        with %User{} = user <- Repo.get(User, user_id),
             {:ok, code} <- allocate_code(user) do
          %PersonalCode{user_id: user_id}
          |> PersonalCode.changeset(%{code: code})
          |> Repo.insert()
          |> case do
            {:ok, row} ->
              {:ok, row}

            # Lost a race: the winner's row is the code.
            {:error, _} ->
              case Repo.get_by(PersonalCode, user_id: user_id) do
                %PersonalCode{} = row -> {:ok, row}
                nil -> {:error, :code_collision}
              end
          end
        else
          nil -> {:error, :user_not_found}
          {:error, _} = err -> err
        end
    end
  end

  def get_or_create_code(_), do: {:error, :invalid}

  def find_by_code(code) when is_binary(code) do
    normalized = code |> String.trim() |> String.upcase()
    Repo.get_by(PersonalCode, code: normalized)
  end

  def find_by_code(_), do: nil

  @doc """
  Redeem a personal code for `redeemer_id`. On success the
  redemption record exists and both accounts hold the friend
  relationship - the read-back both sides see.
  """
  def redeem(redeemer_id, code) when is_binary(redeemer_id) and is_binary(code) do
    case find_by_code(code) do
      nil ->
        {:error, :not_found}

      %PersonalCode{} = personal ->
        cond do
          personal.user_id == redeemer_id ->
            {:error, :cannot_redeem_own}

          already_redeemed?(personal.id, redeemer_id) ->
            {:error, :already_redeemed}

          rate_limited?(redeemer_id) ->
            {:error, :rate_limited}

          true ->
            do_redeem(personal, redeemer_id)
        end
    end
  end

  def redeem(_, _), do: {:error, :invalid}

  @doc "Credit view for the redeemer: who they joined through (or nil)."
  def joined_through(redeemer_id) when is_binary(redeemer_id) do
    redemption =
      InviteRedemption
      |> where([r], r.redeemer_user_id == ^redeemer_id)
      |> order_by([r], asc: r.inserted_at)
      |> limit(1)
      |> Repo.one()

    case redemption do
      nil -> nil
      %InviteRedemption{} = r -> credit_contract(r, :redeemer)
    end
  end

  def joined_through(_), do: nil

  @doc "Credit view for the code owner: everyone who joined through them."
  def joined_through_you(inviter_id) when is_binary(inviter_id) do
    InviteRedemption
    |> where([r], r.inviter_user_id == ^inviter_id)
    |> order_by([r], desc: r.inserted_at)
    |> Repo.all()
    |> Enum.map(&credit_contract(&1, :inviter))
  end

  def joined_through_you(_), do: []

  def to_contract(%PersonalCode{} = row, user_id) do
    %{
      "code" => row.code,
      "share_url" => Invites.share_url(row.code),
      "joined_count" => length(joined_through_you(user_id)),
      "promise" => "Share your code. Anyone who joins with it is connected with you."
    }
  end

  defp credit_contract(%InviteRedemption{} = r, side) do
    inviter = Repo.get(User, r.inviter_user_id)
    redeemer = Repo.get(User, r.redeemer_user_id)

    base = %{
      "redemption_id" => r.id,
      "inviter_user_id" => r.inviter_user_id,
      "inviter_display_name" => inviter && inviter.display_name,
      "redeemer_user_id" => r.redeemer_user_id,
      "redeemer_display_name" => redeemer && redeemer.display_name,
      "joined_at" => r.inserted_at && DateTime.to_iso8601(r.inserted_at)
    }

    case side do
      :redeemer ->
        Map.put(
          base,
          "credit_line",
          "You joined through #{(inviter && inviter.display_name) || "a friend"}"
        )

      :inviter ->
        Map.put(
          base,
          "credit_line",
          "#{(redeemer && redeemer.display_name) || "A friend"} joined through you"
        )
    end
  end

  defp do_redeem(%PersonalCode{} = personal, redeemer_id) do
    Repo.transaction(fn ->
      redemption =
        %InviteRedemption{
          personal_code_id: personal.id,
          inviter_user_id: personal.user_id,
          redeemer_user_id: redeemer_id
        }
        |> InviteRedemption.changeset(%{})
        |> Repo.insert!()

      _ = Relationships.set_type(personal.user_id, redeemer_id, "friend")
      _ = Relationships.set_type(redeemer_id, personal.user_id, "friend")
      redemption
    end)
    |> case do
      {:ok, redemption} -> {:ok, credit_contract(redemption, :redeemer)}
      {:error, _} -> {:error, :already_redeemed}
    end
  end

  defp already_redeemed?(personal_code_id, redeemer_id) do
    Repo.exists?(
      from(r in InviteRedemption,
        where: r.personal_code_id == ^personal_code_id and r.redeemer_user_id == ^redeemer_id
      )
    )
  end

  defp rate_limited?(redeemer_id) do
    since = DateTime.utc_now() |> DateTime.add(-24 * 3600, :second)

    count =
      InviteRedemption
      |> where([r], r.redeemer_user_id == ^redeemer_id and r.inserted_at >= ^since)
      |> Repo.aggregate(:count, :id)

    count >= @daily_redemption_limit
  end

  defp allocate_code(%User{} = user), do: allocate_code_attempt(user, 1)

  defp allocate_code_attempt(_user, attempt) when attempt > @max_code_attempts,
    do: {:error, :code_collision}

  defp allocate_code_attempt(user, attempt) do
    code = Invites.generate_code(user.display_name)

    if Repo.get_by(PersonalCode, code: code) || Invites.get_by_code(code) do
      allocate_code_attempt(user, attempt + 1)
    else
      {:ok, code}
    end
  end
end
