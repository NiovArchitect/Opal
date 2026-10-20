defmodule OpalCore.SocialFlow.GraphLock do
  @moduledoc """
  Repair #19 W7 - the Private graphs passcode lock.

  SECURITY SCOPE (stated plainly, no theater): this lock is a
  VIEWING gate for the owner's own Private graphs area on their own
  signed-in session. The passcode is verified SERVER-side and only a
  salted PBKDF2-HMAC-SHA256 hash is stored - the code itself never
  persists anywhere. Verification returns a boolean only; it mints
  no token and unlocks no server-side data, because the owner's own
  plan list already contains their private plans (flagged) under
  their authenticated session. What the gate protects against is a
  person holding the owner's unlocked phone casually opening the
  Private area - exactly the iPhone Hidden Photos threat model. It
  is NOT encryption, NOT account security, and NOT a barrier against
  anyone who holds the account session itself. Other participants
  never receive a private plan in their lists at all (enforced in
  `SocialFlow.list_plans_for_user/2`) - that exclusion is server-side
  and does not depend on this lock.
  """

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias OpalCore.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @iterations 120_000
  @hash_bytes 32
  @min_code_length 4
  @max_code_length 32

  schema "graph_locks" do
    field :passcode_hash, :binary
    field :salt, :binary
    # Repair #20 F-4: the account's biometric-unlock preference for
    # the Private graphs gate (Settings is its only write home). It
    # is a preference flag ONLY - no credential material is stored
    # server-side; the platform authenticator credential itself is
    # device-local, and the PIN stays the server-verified truth.
    field :biometric_enabled, :boolean, default: false

    belongs_to :user, OpalCore.Accounts.User, foreign_key: :user_id

    timestamps(type: :utc_datetime_usec)
  end

  def set?(user_id) when is_binary(user_id) do
    Repo.exists?(from(l in __MODULE__, where: l.user_id == ^user_id))
  end

  def set?(_), do: false

  @doc """
  The ONE graph-lock projection (Repair #20 F-4): whether a passcode
  is set, and whether the account enabled biometric unlock for the
  gate. Every surface (gate, Settings credential home) reads this
  shape; no surface re-derives either fact.
  """
  def status(user_id) when is_binary(user_id) do
    case Repo.one(from(l in __MODULE__, where: l.user_id == ^user_id)) do
      %__MODULE__{} = lock ->
        %{passcode_set: true, biometric_enabled: lock.biometric_enabled == true}

      _ ->
        %{passcode_set: false, biometric_enabled: false}
    end
  end

  def status(_), do: %{passcode_set: false, biometric_enabled: false}

  @doc """
  Set or clear the biometric-unlock preference. A passcode must
  already exist - biometrics are an unlock FOR the PIN-gated vault,
  never a replacement credential - so an account with no lock gets
  `{:error, :no_passcode_set}` and nothing is written.
  """
  def set_biometric_enabled(user_id, enabled)
      when is_binary(user_id) and is_boolean(enabled) do
    case Repo.one(from(l in __MODULE__, where: l.user_id == ^user_id)) do
      %__MODULE__{} = lock ->
        lock
        |> Ecto.Changeset.change(%{biometric_enabled: enabled})
        |> Repo.update()
        |> case do
          {:ok, _} -> :ok
          {:error, _} -> {:error, :invalid}
        end

      _ ->
        {:error, :no_passcode_set}
    end
  end

  def set_biometric_enabled(_, _), do: {:error, :invalid}

  @doc "Set or replace the account's Private graphs passcode."
  def set_passcode(user_id, code)
      when is_binary(user_id) and is_binary(code) do
    code = String.trim(code)

    cond do
      String.length(code) < @min_code_length -> {:error, :code_too_short}
      String.length(code) > @max_code_length -> {:error, :code_too_long}
      true ->
        salt = :crypto.strong_rand_bytes(16)

        %__MODULE__{user_id: user_id}
        |> changeset(%{salt: salt, passcode_hash: hash(code, salt)})
        |> Repo.insert(
          on_conflict: {:replace, [:passcode_hash, :salt, :updated_at]},
          conflict_target: [:user_id]
        )
        |> case do
          {:ok, _} -> :ok
          {:error, _} -> {:error, :invalid}
        end
    end
  end

  def set_passcode(_, _), do: {:error, :invalid}

  @doc """
  Verify a code against the stored hash in constant time. No lock
  set, or a wrong code, is the same `false` - the caller learns
  nothing about which.
  """
  def verify(user_id, code) when is_binary(user_id) and is_binary(code) do
    case Repo.one(from(l in __MODULE__, where: l.user_id == ^user_id)) do
      %__MODULE__{salt: salt, passcode_hash: stored} ->
        candidate = hash(String.trim(code), salt)
        :crypto.hash_equals(stored, candidate)

      _ ->
        # Spend comparable work so "no lock set" is not a timing tell.
        _ = hash(String.trim(code), :crypto.strong_rand_bytes(16))
        false
    end
  end

  def verify(_, _), do: false

  defp hash(code, salt) do
    :crypto.pbkdf2_hmac(:sha256, code, salt, @iterations, @hash_bytes)
  end

  defp changeset(lock, attrs) do
    lock
    |> cast(attrs, [:passcode_hash, :salt])
    |> validate_required([:user_id, :passcode_hash, :salt])
    |> unique_constraint([:user_id], name: :graph_locks_user_id_index)
  end
end
