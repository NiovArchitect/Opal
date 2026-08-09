defmodule OpalCore.SocialFlow.RealWorld.TokenVault do
  @moduledoc """
  Encrypt provider tokens at rest with AES-256-GCM.

  - unique 12-byte nonce per encryption
  - authenticated encryption (tag)
  - server-only key from OPAL_PROVIDER_TOKEN_SECRET
  - production fails closed if secret missing/weak
  - never log plaintext tokens
  """

  @aad "opal.provider.token.v1"
  # Require high-entropy material: at least 32 bytes of secret string
  @min_secret_bytes 32

  def encrypt(plaintext) when is_binary(plaintext) do
    with {:ok, key} <- key() do
      iv = :crypto.strong_rand_bytes(12)
      {cipher, tag} = :crypto.crypto_one_time_aead(:aes_256_gcm, key, iv, plaintext, @aad, true)
      {:ok, iv <> tag <> cipher}
    end
  end

  def encrypt(nil), do: {:ok, nil}
  def encrypt(_), do: {:error, :invalid}

  def decrypt(nil), do: {:ok, nil}

  def decrypt(blob) when is_binary(blob) and byte_size(blob) > 28 do
    with {:ok, key} <- key() do
      <<iv::binary-12, tag::binary-16, cipher::binary>> = blob

      case :crypto.crypto_one_time_aead(:aes_256_gcm, key, iv, cipher, @aad, tag, false) do
        plain when is_binary(plain) -> {:ok, plain}
        :error -> {:error, :decrypt_failed}
      end
    end
  end

  def decrypt(_), do: {:error, :invalid}

  @doc "Redact for logs — never returns token material."
  def redact_for_log(_), do: "[redacted-token]"

  @doc """
  Validate secret quality. Production must use a cryptographically random secret.
  """
  def validate_secret(secret) when is_binary(secret) do
    cond do
      byte_size(secret) < @min_secret_bytes ->
        {:error, :secret_too_short}

      weak_secret?(secret) ->
        {:error, :secret_too_weak}

      true ->
        :ok
    end
  end

  def validate_secret(_), do: {:error, :secret_missing}

  def configured? do
    match?({:ok, _}, key())
  end

  defp key do
    secret =
      Application.get_env(:opal_core, :provider_token_secret) ||
        System.get_env("OPAL_PROVIDER_TOKEN_SECRET")

    env = Application.get_env(:opal_core, :env) || Mix.env()

    cond do
      is_binary(secret) ->
        case validate_secret(secret) do
          :ok ->
            {:ok, :crypto.hash(:sha256, secret)}

          {:error, reason} ->
            if env == :prod do
              {:error, reason}
            else
              # Non-prod still fails weak secrets if explicitly set wrong;
              # only missing secret uses test helper below.
              {:error, reason}
            end
        end

      env == :prod ->
        {:error, :secret_missing}

      env in [:test, :dev] ->
        # Explicit test/dev fallback only when secret unset — never in prod.
        # Still high-entropy fixed material unique to this module salt.
        test_secret = Application.get_env(:opal_core, :provider_token_secret_test_fallback)

        if is_binary(test_secret) and validate_secret(test_secret) == :ok do
          {:ok, :crypto.hash(:sha256, test_secret)}
        else
          # Last resort for tests: derived from Endpoint secret_key_base if available
          case endpoint_secret() do
            {:ok, sk} -> {:ok, :crypto.hash(:sha256, "opal.provider.vault|" <> sk)}
            _ -> {:error, :secret_missing}
          end
        end

      true ->
        {:error, :secret_missing}
    end
  end

  defp weak_secret?(s) do
    low = String.downcase(s)

    low in ~w(password secret changeme) or
      String.contains?(low, "password") or
      String.contains?(low, "dev-only") or
      (String.printable?(s) and Regex.match?(~r/\A(.)\1{15,}\z/, s))
  end

  defp endpoint_secret do
    case Application.get_env(:opal_core, OpalCoreWeb.Endpoint)[:secret_key_base] do
      sk when is_binary(sk) and byte_size(sk) >= 32 -> {:ok, sk}
      _ -> :error
    end
  end
end
