defmodule OpalCore.Invites do
  @moduledoc """
  Phase NE-1 — invite friends to join Opal.

  Network growth via genuine sharing. Max 10 invites/day. Rewards tracked only.
  """

  import Ecto.Query

  require Logger

  alias OpalCore.Accounts.User
  alias OpalCore.Invites.DeliverInviteSmsWorker
  alias OpalCore.Invites.Invite
  alias OpalCore.Invites.InviteReward
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Onboarding
  alias OpalCore.SocialFlow.Sms.TwilioSmsAdapter

  @ttl_days 30
  @daily_limit 10
  @max_code_attempts 5
  @alphabet ~c"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

  @doc "Share URL for a code — uses PUBLIC_BASE_URL (lan/tunnel/production)."
  def share_url(code) when is_binary(code) do
    OpalCore.PublicBaseUrl.url("/invite/#{URI.encode_www_form(code)}")
  end

  def share_url(_), do: OpalCore.PublicBaseUrl.url("/invite")

  @doc """
  Create an invite for `inviter_id`.

  Optional attrs: `:invitee_phone`, `:invitee_email` (or string keys).
  Generates unique code. Expires in 30 days. Status `"sent"`.
  Rate limit: max #{@daily_limit}/day.
  """
  def create_invite(inviter_id, attrs \\ %{})

  def create_invite(inviter_id, attrs) when is_binary(inviter_id) and is_map(attrs) do
    with :ok <- check_rate_limit(inviter_id),
         %User{} = inviter <- Repo.get(User, inviter_id),
         {:ok, code} <- allocate_code(inviter) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
      phone = blank_to_nil(attrs[:invitee_phone] || attrs["invitee_phone"])
      email = blank_to_nil(attrs[:invitee_email] || attrs["invitee_email"])

      %Invite{}
      |> Invite.changeset(%{
        inviter_id: inviter_id,
        code: code,
        invitee_phone: phone,
        invitee_email: email,
        status: "sent",
        expires_at: DateTime.add(now, @ttl_days * 24 * 3600, :second)
      })
      |> Repo.insert()
    else
      nil -> {:error, :inviter_not_found}
      {:error, _} = err -> err
    end
  end

  def create_invite(_, _), do: {:error, :invalid}

  @doc "Return invite by code if present and not expired. Else nil."
  def get_by_code(code) when is_binary(code) do
    code = String.trim(code) |> String.upcase()

    case Repo.get_by(Invite, code: code) do
      %Invite{} = inv ->
        if expired?(inv) do
          maybe_mark_expired(inv)
          nil
        else
          inv
        end

      nil ->
        nil
    end
  end

  def get_by_code(_), do: nil

  @doc "Validate code for join: not expired, not already joined."
  def validate_code(code) when is_binary(code) do
    case get_by_code(code) do
      %Invite{status: "joined"} -> {:error, :already_joined}
      %Invite{} = inv -> {:ok, inv}
      nil -> {:error, :not_found}
    end
  end

  def validate_code(_), do: {:error, :not_found}

  @doc "Mark invite opened (idempotent)."
  def mark_opened(code) when is_binary(code) do
    case get_by_code(code) do
      %Invite{status: "sent"} = inv ->
        inv
        |> Invite.changeset(%{status: "opened"})
        |> Repo.update()

      %Invite{} = inv ->
        {:ok, inv}

      nil ->
        {:error, :not_found}
    end
  end

  def mark_opened(_), do: {:error, :invalid}

  @doc """
  Mark invite joined. Links users, creates friend relationship both ways,
  increments inviter rewards. Returns `{:ok, invite, welcome_message}`.
  """
  def mark_joined(code, joined_user_id)
      when is_binary(code) and is_binary(joined_user_id) do
    case validate_code(code) do
      {:ok, %Invite{} = inv} ->
        if inv.inviter_id == joined_user_id do
          {:error, :cannot_join_own}
        else
          do_mark_joined(inv, joined_user_id)
        end

      {:error, _} = err ->
        err
    end
  end

  def mark_joined(_, _), do: {:error, :invalid}

  @doc "All invites for inviter (newest first)."
  def for_inviter(inviter_id) when is_binary(inviter_id) do
    from(i in Invite,
      where: i.inviter_id == ^inviter_id,
      order_by: [desc: i.inserted_at]
    )
    |> Repo.all()
    |> Enum.map(&refresh_expired/1)
  end

  def for_inviter(_), do: []

  @doc "Count of sent/opened (not joined/expired)."
  def pending_for_inviter(inviter_id) when is_binary(inviter_id) do
    now = DateTime.utc_now()

    from(i in Invite,
      where:
        i.inviter_id == ^inviter_id and i.status in ^["sent", "opened"] and
          i.expires_at > ^now
    )
    |> Repo.aggregate(:count, :id)
  end

  def pending_for_inviter(_), do: 0

  @doc "Reward row for user (or nil)."
  def rewards_for(user_id) when is_binary(user_id) do
    Repo.get_by(InviteReward, user_id: user_id)
  end

  def rewards_for(_), do: nil

  @doc """
  After create: optionally queue SMS / log email. Never auto without attrs.
  Returns delivery map for API.
  """
  def maybe_deliver(%Invite{} = invite, %User{} = inviter) do
    base = %{
      "share_url" => share_url(invite.code),
      "sms_queued" => false,
      "email_queued" => false
    }

    base
    |> maybe_queue_sms(invite, inviter)
    |> maybe_log_email(invite, inviter)
  end

  def maybe_deliver(_, _), do: %{"sms_queued" => false, "email_queued" => false}

  @doc "API contract for one invite (no extra PII beyond what inviter provided)."
  def to_contract(invite, opts \\ [])

  def to_contract(%Invite{} = i, opts) when is_list(opts) do
    inviter = Repo.get(User, i.inviter_id)
    inviter_name = (inviter && inviter.display_name) || "A friend"

    rel_type =
      Keyword.get(opts, :relationship_type) ||
        (is_binary(i.joined_user_id) &&
           OpalCore.Relationships.get_type(i.inviter_id, i.joined_user_id)) ||
        "friend"

    tone = OpalCore.Relationships.Behavior.invite_copy(rel_type, inviter_name)

    %{
      "id" => i.id,
      "code" => i.code,
      "status" => display_status(i),
      "invitee_phone" => i.invitee_phone,
      "invitee_email" => i.invitee_email,
      "joined_user_id" => i.joined_user_id,
      "share_url" => share_url(i.code),
      "expires_at" => datetime(i.expires_at),
      "inserted_at" => datetime(i.inserted_at),
      "updated_at" => datetime(i.updated_at),
      "invite_copy" => tone.body,
      "invite_tone" => tone.tone,
      "shame_free" => true
    }
  end

  def to_contract(_, _), do: nil

  @doc "Public validate payload."
  def validate_contract(%Invite{} = i) do
    inviter = Repo.get(User, i.inviter_id)

    %{
      "valid" => true,
      "code" => i.code,
      "status" => i.status,
      "inviter_display_name" => inviter && inviter.display_name,
      "expires_at" => datetime(i.expires_at)
    }
  end

  def welcome_message(inviter_name) when is_binary(inviter_name) and inviter_name != "" do
    "#{inviter_name} invited you to Opal. You're now connected."
  end

  def welcome_message(_), do: "You've been invited to Opal. You're now connected."

  # --- internals -----------------------------------------------------------

  defp do_mark_joined(%Invite{} = inv, joined_user_id) do
    inviter = Repo.get!(User, inv.inviter_id)

    Repo.transaction(fn ->
      {:ok, updated} =
        inv
        |> Invite.changeset(%{status: "joined", joined_user_id: joined_user_id})
        |> Repo.update()

      _ = Relationships.set_type(inv.inviter_id, joined_user_id, "friend")
      _ = Relationships.set_type(joined_user_id, inv.inviter_id, "friend")
      _ = increment_rewards(inv.inviter_id)

      {updated, welcome_message(inviter.display_name)}
    end)
    |> case do
      {:ok, {updated, welcome}} -> {:ok, updated, welcome}
      {:error, reason} -> {:error, reason}
    end
  end

  defp increment_rewards(user_id) do
    case Repo.get_by(InviteReward, user_id: user_id) do
      nil ->
        %InviteReward{}
        |> InviteReward.changeset(%{user_id: user_id, successful_invites: 1})
        |> Repo.insert()

      %InviteReward{} = row ->
        row
        |> InviteReward.changeset(%{successful_invites: row.successful_invites + 1})
        |> Repo.update()
    end
  end

  defp check_rate_limit(inviter_id) do
    since = DateTime.utc_now() |> DateTime.add(-24 * 3600, :second)

    count =
      from(i in Invite,
        where: i.inviter_id == ^inviter_id and i.inserted_at >= ^since
      )
      |> Repo.aggregate(:count, :id)

    if count >= @daily_limit, do: {:error, :rate_limited}, else: :ok
  end

  defp allocate_code(%User{} = inviter) do
    allocate_code_attempt(inviter, 1)
  end

  defp allocate_code_attempt(_inviter, attempt) when attempt > @max_code_attempts do
    {:error, :code_collision}
  end

  defp allocate_code_attempt(inviter, attempt) do
    code = generate_code(inviter.display_name)

    case Repo.get_by(Invite, code: code) do
      nil -> {:ok, code}
      _ -> allocate_code_attempt(inviter, attempt + 1)
    end
  end

  @doc false
  def generate_code(display_name) when is_binary(display_name) do
    prefix = name_prefix(display_name)
    suffix = random_suffix()
    "#{prefix}-#{suffix}"
  end

  def generate_code(_), do: generate_code("OPAL")

  defp name_prefix(display_name) do
    first =
      display_name
      |> String.trim()
      |> String.split(~r/\s+/, trim: true)
      |> List.first()
      |> Kernel.||("OPAL")
      |> String.upcase()
      |> String.replace(~r/[^A-Z0-9]/u, "")

    first
    |> String.slice(0, 4)
    |> pad_prefix()
  end

  defp pad_prefix(s) when byte_size(s) >= 4, do: String.slice(s, 0, 4)
  defp pad_prefix(s), do: String.pad_trailing(s, 4, "X")

  defp random_suffix do
    fun = Application.get_env(:opal_core, :invite_code_random, &default_random_suffix/0)
    fun.()
  end

  # 8-char cryptographic-ish suffix → PREFIX-XXXXXXXX ≥ 12 chars total (Phase 3.1).
  defp default_random_suffix do
    :crypto.strong_rand_bytes(8)
    |> :binary.bin_to_list()
    |> Enum.map(fn b -> Enum.at(@alphabet, rem(b, length(@alphabet))) end)
    |> List.to_string()
  end

  defp expired?(%Invite{expires_at: %DateTime{} = exp}),
    do: DateTime.compare(DateTime.utc_now(), exp) != :lt

  defp expired?(_), do: true

  defp maybe_mark_expired(%Invite{status: s} = inv) when s in ~w(sent opened) do
    _ =
      inv
      |> Invite.changeset(%{status: "expired"})
      |> Repo.update()

    :ok
  end

  defp maybe_mark_expired(_), do: :ok

  defp refresh_expired(%Invite{} = inv) do
    if expired?(inv) and inv.status in ~w(sent opened) do
      case inv |> Invite.changeset(%{status: "expired"}) |> Repo.update() do
        {:ok, updated} -> updated
        _ -> inv
      end
    else
      inv
    end
  end

  # Paste I I2 — aged unanswered invites surface as terminal "no_response_yet"
  # (not eternal limbo "pending"/"sent"). DB status stays sent/opened.
  @no_response_after_seconds 7 * 24 * 3600

  defp display_status(%Invite{} = inv) do
    cond do
      expired?(inv) and inv.status in ~w(sent opened) ->
        "expired"

      inv.status in ~w(sent opened) and aged_unanswered?(inv) ->
        "no_response_yet"

      true ->
        inv.status
    end
  end

  defp aged_unanswered?(%Invite{inserted_at: %DateTime{} = at}) do
    DateTime.diff(DateTime.utc_now(), at, :second) >= @no_response_after_seconds
  end

  defp aged_unanswered?(_), do: false

  defp maybe_queue_sms(base, %Invite{invitee_phone: phone} = invite, %User{} = inviter)
       when is_binary(phone) and phone != "" do
    case Onboarding.normalize_e164(phone) do
      {:ok, e164} ->
        case TwilioSmsAdapter.readiness() do
          :ready ->
            body = sms_body(inviter.display_name, invite.code)

            case DeliverInviteSmsWorker.enqueue(e164, body) do
              {:ok, _job} ->
                Map.merge(base, %{
                  "sms_queued" => true,
                  "sms_adapter" => "twilio"
                })

              {:error, reason} ->
                Logger.warning("invite.sms_enqueue_failed reason=#{inspect(reason)}")

                Map.merge(base, %{
                  "sms_queued" => false,
                  "sms_adapter" => "twilio",
                  "sms_error" => to_string(reason),
                  "sms_honest" => "SMS could not be queued — share the link instead."
                })
            end

          {:disabled, reason} ->
            # Honest: do not pretend SMS sent when Twilio is not configured.
            Map.merge(base, %{
              "sms_queued" => false,
              "sms_adapter" => "disabled",
              "sms_error" => to_string(reason),
              "sms_honest" =>
                "SMS invites need Twilio setup — share the link instead."
            })
        end

      {:error, _} ->
        Map.merge(base, %{
          "sms_queued" => false,
          "sms_error" => "invalid_number",
          "sms_honest" => "That phone number looks invalid — share the link instead."
        })
    end
  end

  defp maybe_queue_sms(base, _, _), do: base

  defp maybe_log_email(base, %Invite{invitee_email: email} = invite, %User{} = inviter)
       when is_binary(email) and email != "" do
    Logger.info(
      "invite.email_manual code=#{invite.code} inviter=#{inviter.id} note=no_email_system"
    )

    Map.merge(base, %{
      "email_queued" => false,
      "email_note" => "no_email_system_use_share_link"
    })
  end

  defp maybe_log_email(base, _, _), do: base

  defp sms_body(name, code) do
    who = if is_binary(name) and name != "", do: name, else: "A friend"
    "#{who} invited you to Opal — the app that plans your social life. Join: #{share_url(code)}"
  end

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(s) when is_binary(s) do
    t = String.trim(s)
    if t == "", do: nil, else: t
  end

  defp blank_to_nil(_), do: nil

  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime(_), do: nil
end
