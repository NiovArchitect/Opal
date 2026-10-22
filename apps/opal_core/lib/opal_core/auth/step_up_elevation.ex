defmodule OpalCore.Auth.StepUpElevation do
  @moduledoc """
  Repair #24 (WS-5) - the memory step-up elevation.

  FOUNDER LAW (2026-10-20, polish wave): manual Memory add/delete
  must be checked and timestamped. Until this repair the honest
  state, stated in the Memory room itself, was that NO step-up
  existed - and the reason is structural, verified for this repair:

  - the account credential model carries NO password. The `users`
    schema (`OpalCore.Accounts.User`) has no password / password_hash
    field, no migration ever added one, and nothing in the auth
    code hashes or checks a password for an account.
  - the account's actual credential is the phone code:
    `OpalCore.SocialFlow.Onboarding` verifies control of the
    account's verified phone number (VerificationChallenge,
    purpose-gated, digest-checked in synthetic mode and provider-
    checked in production SMS mode) and only then registers a
    DeviceSession.

  So this module does NOT fake a password check. The step-up is a
  FRESH phone-code verification for the signed-in account
  (Onboarding.start_step_up_verification/2 and
  complete_step_up_verification/2, purpose "sensitive_change",
  bound to the account, and refused unless the number's active
  verified identifier belongs to that account). Completing it
  grants an ELEVATION:

  - a row in `step_up_elevations` (granted_at / expires_at are its
    timestamps) plus a signed token naming the row;
  - bound to the account AND the device session that asked - an
    elevation minted under account A's session never authorizes a
    mutation under account B's session, or even under a different
    session of A's;
  - short-lived (5 minutes by default) and revocable;
  - the ONLY key the manual memory mutations accept: capsule
    create, capsule forget, and fact forget all require a live
    elevation and, on success, write a timestamped AuditEvent row
    (`memory.mutation.*`) recording the action, the target, the
    elevation, and the credential kind ("phone_code").

  WHAT IS STILL MISSING (founder decision, carried verbatim in the
  repair report): a password step-up cannot exist until accounts
  carry a password credential. Adding one is a founder identity
  decision, not a repair-scope change. Until then the phone code -
  the credential the account actually has - is what is checked.
  """

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AuditEvent

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @salt "opal.memory.step_up.v1"
  @default_ttl_sec 5 * 60
  # Token signature window: comfortably above the DB-authoritative
  # TTL so expiry is decided by the row's expires_at, never by the
  # signature alone.
  @token_max_age_sec 60 * 60
  @purpose "memory_mutation"
  @credential_kind "phone_code"

  schema "step_up_elevations" do
    field :session_id, :binary_id
    field :purpose, :string, default: @purpose
    field :credential_kind, :string, default: @credential_kind
    field :verification_challenge_id, :binary_id
    field :granted_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec

    belongs_to :user, OpalCore.Accounts.User, foreign_key: :user_id

    timestamps(type: :utc_datetime_usec)
  end

  def purpose, do: @purpose
  def credential_kind, do: @credential_kind
  def default_ttl_sec, do: @default_ttl_sec

  @doc """
  Grant an elevation for `user_id` + `session_id` after a verified
  step-up challenge. Options: `ttl_sec:` (tests use it to mint an
  already-expired grant honestly, through the same grant path).
  Returns `{:ok, elevation, token}`.
  """
  def grant(user_id, session_id, verification_challenge_id, opts \\ [])
      when is_binary(user_id) and is_binary(session_id) do
    ttl = Keyword.get(opts, :ttl_sec, @default_ttl_sec)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    expires = DateTime.add(now, ttl, :second)

    %__MODULE__{user_id: user_id}
    |> changeset(%{
      session_id: session_id,
      purpose: @purpose,
      credential_kind: @credential_kind,
      verification_challenge_id: verification_challenge_id,
      granted_at: now,
      expires_at: expires
    })
    |> Repo.insert()
    |> case do
      {:ok, elevation} -> {:ok, elevation, sign_token(elevation)}
      {:error, _} = err -> err
    end
  end

  def grant(_, _, _, _), do: {:error, :invalid}

  def sign_token(%__MODULE__{} = elevation) do
    Phoenix.Token.sign(OpalCoreWeb.Endpoint, @salt, %{
      "uid" => elevation.user_id,
      "sid" => elevation.session_id,
      "eid" => elevation.id,
      "kind" => "memory_step_up"
    })
  end

  @doc """
  Authorize a presented token for exactly this account + session.

  Returns `{:ok, elevation}` only when the signature is valid, the
  row exists, it names the same account and session, it has not
  been revoked, and its expires_at is still ahead. Every other
  shape - missing, malformed, foreign, expired, revoked - is
  `{:error, :step_up_required}`, so a caller learns nothing about
  which condition failed.
  """
  def authorize(user_id, session_id, token)
      when is_binary(user_id) and is_binary(session_id) and is_binary(token) and token != "" do
    with {:ok,
          %{"uid" => ^user_id, "sid" => ^session_id, "eid" => eid, "kind" => "memory_step_up"}} <-
           Phoenix.Token.verify(OpalCoreWeb.Endpoint, @salt, token, max_age: @token_max_age_sec),
         %__MODULE__{user_id: ^user_id, session_id: ^session_id} = elevation <-
           Repo.get(__MODULE__, eid),
         true <- live?(elevation) do
      {:ok, elevation}
    else
      _ -> {:error, :step_up_required}
    end
  end

  def authorize(_, _, _), do: {:error, :step_up_required}

  @doc "True when an elevation row is unrevoked and unexpired."
  def live?(%__MODULE__{} = elevation) do
    is_nil(elevation.revoked_at) and
      DateTime.compare(DateTime.utc_now(), elevation.expires_at) == :lt
  end

  def live?(_), do: false

  @doc "The caller's live elevation for this session, if one exists."
  def live_elevation(user_id, session_id) when is_binary(user_id) and is_binary(session_id) do
    now = DateTime.utc_now()

    Repo.one(
      from(e in __MODULE__,
        where:
          e.user_id == ^user_id and e.session_id == ^session_id and is_nil(e.revoked_at) and
            e.expires_at > ^now,
        order_by: [desc: e.granted_at],
        limit: 1
      )
    )
  end

  def live_elevation(_, _), do: nil

  @doc "Revoke the caller's elevation (sign-out of the step-up, not the session)."
  def revoke(%__MODULE__{} = elevation) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    elevation
    |> Ecto.Changeset.change(%{revoked_at: now})
    |> Repo.update()
    |> case do
      {:ok, updated} -> {:ok, updated}
      {:error, _} -> {:error, :invalid}
    end
  end

  @doc """
  The audit timestamp for a gated mutation: one AuditEvent row per
  successful gated memory mutation, stamped by its inserted_at and
  carrying the action, the target, the elevation that authorized
  it, the session, and the credential kind that was actually
  checked. Written ONLY after the mutation succeeds.
  """
  def record_mutation_audit(%__MODULE__{} = elevation, action, target_id)
      when is_binary(action) do
    audited_at = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %AuditEvent{}
    |> AuditEvent.changeset(%{
      actor_user_id: elevation.user_id,
      event_type: "memory.mutation.#{action}",
      payload: %{
        "action" => action,
        "target_id" => target_id,
        "elevation_id" => elevation.id,
        "session_id" => elevation.session_id,
        "credential_kind" => elevation.credential_kind,
        "audited_at" => DateTime.to_iso8601(audited_at)
      },
      trace_id: "trace-memory-step-up"
    })
    |> Repo.insert()
    |> case do
      {:ok, _} -> :ok
      {:error, _} -> :error
    end
  end

  def to_contract(%__MODULE__{} = elevation, token) do
    %{
      "elevated" => live?(elevation),
      "credential_kind" => elevation.credential_kind,
      "credential" => "phone_code",
      "password_credential_exists" => false,
      "granted_at" => elevation.granted_at && DateTime.to_iso8601(elevation.granted_at),
      "expires_at" => elevation.expires_at && DateTime.to_iso8601(elevation.expires_at),
      "elevation_token" => token
    }
  end

  defp changeset(elevation, attrs) do
    elevation
    |> cast(attrs, [
      :session_id,
      :purpose,
      :credential_kind,
      :verification_challenge_id,
      :granted_at,
      :expires_at,
      :revoked_at
    ])
    |> validate_required([
      :user_id,
      :session_id,
      :purpose,
      :credential_kind,
      :granted_at,
      :expires_at
    ])
    |> validate_inclusion(:purpose, [@purpose])
    |> validate_inclusion(:credential_kind, [@credential_kind])
  end
end
