defmodule OpalCore.SocialFlow.RealWorld.Contacts.Matching do
  @moduledoc """
  Privacy-preserving contact matching contract.

  Goals: optional match of selected contacts to Opal users; invite with context.
  Does not require full address-book upload when hashed matching is used.
  """

  @doc """
  Build a matching request from **selected** contacts only.
  """
  def build_request(attrs) when is_map(attrs) do
    a = stringify(attrs)
    contacts = List.wrap(a["selected_contacts"] || [])

    cond do
      not is_binary(a["owner_user_id"]) ->
        {:error, :owner_required}

      contacts == [] ->
        {:error, :contacts_required}

      length(contacts) > 500 ->
        {:error, :too_many}

      true ->
        hashed =
          Enum.map(contacts, fn c ->
            c = stringify(c)

            %{
              "hash" => hash_identifier(c["e164"] || c["phone"] || c["email"]),
              "display_hint" => c["display_hint"],
              "raw_uploaded" => false
            }
          end)

        {:ok,
         %{
           "schema_version" => "0.1.0",
           "owner_user_id" => a["owner_user_id"],
           "method" => "hashed_selected",
           "contacts" => hashed,
           "full_address_book_uploaded" => false
         }}
    end
  end

  def build_request(_), do: {:error, :invalid}

  @doc "Contextual invite payload (better than Join Opal!)."
  def contextual_invite(attrs) when is_map(attrs) do
    a = stringify(attrs)

    {:ok,
     %{
       "schema_version" => "0.1.0",
       "inviter_user_id" => a["inviter_user_id"],
       "conversation_id" => a["conversation_id"],
       "plan_context" => a["plan_context"],
       "copy_class" => "contextual",
       "shared_safe_summary" =>
         a["shared_safe_summary"] || "You're invited to a plan on Opal.",
       "deep_link_resume" => true,
       "spam_invite" => false
     }}
  end

  def contextual_invite(_), do: {:error, :invalid}

  defp hash_identifier(nil), do: nil

  defp hash_identifier(raw) when is_binary(raw) do
    :crypto.hash(:sha256, String.trim(raw)) |> Base.encode16(case: :lower)
  end

  defp hash_identifier(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
