defmodule OpalCore.SocialFlow.RealWorld.TokenVault do
  @moduledoc """
  Encrypt provider tokens at rest. Never log plaintext tokens.

  Uses AES-256-GCM with an application secret derived key.
  """

  @aad "opal.provider.token.v1"

  def encrypt(plaintext) when is_binary(plaintext) do
    key = key()
    iv = :crypto.strong_rand_bytes(12)
    {cipher, tag} = :crypto.crypto_one_time_aead(:aes_256_gcm, key, iv, plaintext, @aad, true)
    {:ok, iv <> tag <> cipher}
  end

  def encrypt(nil), do: {:ok, nil}
  def encrypt(_), do: {:error, :invalid}

  def decrypt(nil), do: {:ok, nil}

  def decrypt(blob) when is_binary(blob) and byte_size(blob) > 28 do
    key = key()
    <<iv::binary-12, tag::binary-16, cipher::binary>> = blob

    case :crypto.crypto_one_time_aead(:aes_256_gcm, key, iv, cipher, @aad, tag, false) do
      plain when is_binary(plain) -> {:ok, plain}
      :error -> {:error, :decrypt_failed}
    end
  end

  def decrypt(_), do: {:error, :invalid}

  @doc "Redact for logs — never returns token material."
  def redact_for_log(_), do: "[redacted-token]"

  defp key do
    secret =
      Application.get_env(:opal_core, :provider_token_secret) ||
        System.get_env("OPAL_PROVIDER_TOKEN_SECRET") ||
        "dev-only-provider-token-secret-32b!"

    :crypto.hash(:sha256, secret)
  end
end
