defmodule OpalCore.MemoryWallet.ScopedContext do
  @moduledoc """
  W-GAP-09 first form for the capsule class - the scoped-context
  assembly path for personal-memory capsules.

  This is the ONLY assembly that turns capsules into a context
  package (for the Center / the LLM prompt): it reads exclusively
  through `CapsuleRead.list_for_owner/2`, so the package is by
  construction the intersection of {the owner's capsules} and
  {admissible under scope + purpose + expiry}. It assembles for
  exactly one account per call - the account is a required,
  explicit input, never inferred from the capsules found.

  HARD ISOLATION: a package for account B cannot contain account
  A's capsules or any content derived from them - not a summary,
  not a count, not an aggregate. The count in a package counts only
  that package's own capsules. The permanent two-account isolation
  suite (W-GAP-32) proves this against the literal package text
  and the literal LLM prompt payload.
  """

  alias OpalCore.MemoryWallet.{CapsuleRead, PersonalMemoryCapsule}

  @doc """
  Assemble the scoped context package for one account.

  Opts pass straight to the mediated read: `purpose:`,
  `scope_kind:` / `scope_id:`, `now:`.
  """
  def assemble(owner_user_id, opts \\ [])

  def assemble(owner_user_id, opts) when is_binary(owner_user_id) and is_list(opts) do
    capsules = CapsuleRead.list_for_owner(owner_user_id, opts)

    lines =
      Enum.map(capsules, fn capsule ->
        summary = PersonalMemoryCapsule.summary(capsule)
        "- #{summary}"
      end)

    text =
      case lines do
        [] ->
          nil

        _ ->
          "What Opal remembers for this person (their own memories only):\n" <>
            Enum.join(lines, "\n")
      end

    %{
      account_id: owner_user_id,
      capsules: Enum.map(capsules, &PersonalMemoryCapsule.to_contract/1),
      capsule_count: length(capsules),
      text: text
    }
  end

  def assemble(_, _), do: %{account_id: nil, capsules: [], capsule_count: 0, text: nil}

  @doc "The prompt section for one account - the package's text leg, or nil when the account has no admissible capsules."
  def prompt_section(owner_user_id, opts \\ []) do
    owner_user_id
    |> assemble(opts)
    |> Map.get(:text)
  end
end
