defmodule OpalCore.MemoryWallet.PersonalMemoryCapsule do
  @moduledoc """
  W-GAP-02 first form - a personal-memory capsule as ONE object.

  The struct is the single shape every consumer of the covered class
  receives: `payload` (what is remembered), `provenance` (where it
  came from, in plain words as well as machine fields), and
  `scope_policy` - the scope-policy dimensions AS DATA, following
  WALLET_MAP section A: roles, relationships, time, purpose,
  consent, emergency overrides, jurisdiction, and
  transformation/retention.

  Two sources feed the one shape, with no data rewrite:

  - NEW personal memories live as `MemoryCapsule` rows (the capsule
    table) and convert with `from_capsule_row/1`.
  - EXISTING durable-preference fragments (the
    `DurablePreferenceMemory` class over `personal_relationship_memories`)
    convert with `from_durable_fragment/1`. The fragment row stays
    where it is; the capsule is a facade over it, and forgetting the
    capsule routes back through the owner's durable path.

  `source` says which store backs the capsule (`:capsule` or
  `:durable_preference`) - provenance, never a second shape.
  """

  alias OpalCore.MemoryWallet.MemoryCapsule

  @enforce_keys [:id, :source, :owner_user_id, :payload, :provenance, :scope_policy]
  defstruct [
    :id,
    :source,
    :owner_user_id,
    :wallet_id,
    :payload,
    :provenance,
    :scope_policy,
    :expires_at,
    :review_at,
    :version,
    :inserted_at
  ]

  @scope_dimensions ~w(roles relationships time purpose consent emergency_overrides jurisdiction transformation_retention)

  def scope_dimensions, do: @scope_dimensions

  @doc """
  The one scope-policy builder. Every dimension is present as data;
  an absent fact is an explicit value (`nil` / `"owner_only"` /
  `"none"`), never a missing key a reader could guess at.
  """
  def scope_policy(opts) when is_map(opts) do
    scope_kind = opts[:scope_kind] || opts["scope_kind"] || "user"
    scope_id = opts[:scope_id] || opts["scope_id"]
    purpose = opts[:purpose] || opts["purpose"]
    counterpart = opts[:counterpart_user_id] || opts["counterpart_user_id"]

    %{
      "scope" => %{"kind" => scope_kind, "id" => scope_id},
      "roles" => ["owner"],
      "relationships" => if(counterpart, do: %{"counterpart_user_id" => counterpart}, else: nil),
      "time" => %{
        "expires_at" => iso(opts[:expires_at] || opts["expires_at"]),
        "review_at" => iso(opts[:review_at] || opts["review_at"])
      },
      "purpose" => purpose,
      "consent" => "owner_private",
      "emergency_overrides" => "none",
      "jurisdiction" => nil,
      "transformation_retention" => %{"retention" => "until_forgotten_or_expired"}
    }
  end

  @doc "Convert a stored capsule row into the one capsule object."
  def from_capsule_row(%MemoryCapsule{} = row) do
    %__MODULE__{
      id: row.id,
      source: :capsule,
      owner_user_id: row.owner_user_id,
      wallet_id: row.wallet_id,
      payload: row.payload || %{},
      provenance: row.provenance || %{},
      scope_policy: row.scope_policy || %{},
      expires_at: row.expires_at,
      review_at: row.review_at,
      version: row.version,
      inserted_at: row.inserted_at
    }
  end

  @doc """
  Convert an existing durable-preference fragment into the one
  capsule object, without touching the fragment's row. The
  fragment's purpose string (`base|weight|polarity`) decodes into
  the payload and the policy's purpose dimension; its counterpart,
  when present, becomes the relationship scope.
  """
  def from_durable_fragment(%{__struct__: OpalCore.SocialFlow.RelationshipMemory} = m) do
    {base_purpose, _weight, _polarity} = decode_purpose(m.purpose)

    scope_kind = if m.counterpart_user_id, do: "relationship", else: "user"
    scope_id = if m.counterpart_user_id, do: m.counterpart_user_id, else: nil

    %__MODULE__{
      id: m.id,
      source: :durable_preference,
      owner_user_id: m.owner_user_id,
      wallet_id: nil,
      payload: %{
        "summary" => m.summary,
        "value" => m.summary,
        "kind" => "personal_memory"
      },
      provenance: %{
        "source_kind" => "durable_preference_memory",
        "source_label" => "A preference you saved with Opal",
        "learned_from_kind" => "explicit_fact",
        "stored_at" => iso(m.inserted_at)
      },
      scope_policy:
        scope_policy(%{
          scope_kind: scope_kind,
          scope_id: scope_id,
          purpose: base_purpose,
          counterpart_user_id: m.counterpart_user_id,
          expires_at: m.expires_at,
          review_at: m.review_at
        }),
      expires_at: m.expires_at,
      review_at: m.review_at,
      version: 1,
      inserted_at: m.inserted_at
    }
  end

  @doc "The capsule's summary text (its payload's human line), or nil."
  def summary(%__MODULE__{payload: payload}) when is_map(payload) do
    payload["summary"] || payload["value"]
  end

  def summary(_), do: nil

  @doc "The capsule's scope kind, read from its policy data."
  def scope_kind(%__MODULE__{scope_policy: policy}) when is_map(policy) do
    get_in(policy, ["scope", "kind"]) || policy["scope_kind"]
  end

  def scope_kind(_), do: nil

  @doc "The capsule's scope id, read from its policy data."
  def scope_id(%__MODULE__{scope_policy: policy}) when is_map(policy) do
    get_in(policy, ["scope", "id"]) || policy["scope_id"]
  end

  def scope_id(_), do: nil

  @doc "The capsule's purpose, read from its policy data."
  def purpose(%__MODULE__{scope_policy: policy}) when is_map(policy) do
    policy["purpose"]
  end

  def purpose(_), do: nil

  @doc "The finished contract every surface and package renders."
  def to_contract(%__MODULE__{} = capsule) do
    %{
      "id" => capsule.id,
      "source" => Atom.to_string(capsule.source),
      "owner_user_id" => capsule.owner_user_id,
      "wallet_id" => capsule.wallet_id,
      "summary" => summary(capsule),
      "payload" => capsule.payload,
      "provenance" => capsule.provenance,
      "provenance_label" => capsule.provenance["source_label"],
      "scope_policy" => capsule.scope_policy,
      "scope_kind" => scope_kind(capsule),
      "purpose" => purpose(capsule),
      "expires_at" => iso(capsule.expires_at),
      "review_at" => iso(capsule.review_at),
      "version" => capsule.version,
      "created_at" => iso(capsule.inserted_at),
      "because" => because_line(capsule)
    }
  end

  # SM-TRU-02 first form for this class: a basis line exists only
  # when the capsule's own provenance carries one - never invented.
  defp because_line(%__MODULE__{} = capsule) do
    label = capsule.provenance["source_label"]
    summary = summary(capsule)

    if is_binary(label) and is_binary(summary) and summary != "" do
      "Because you told Opal: #{summary}"
    end
  end

  defp decode_purpose(purpose) when is_binary(purpose) do
    case String.split(purpose, "|") do
      [base, weight, polarity | _] -> {base, weight, polarity}
      [base, weight] -> {base, weight, "prefer"}
      [base] -> {base, "relationship_specific", "prefer"}
      _ -> {"personal_memory", "relationship_specific", "prefer"}
    end
  end

  defp decode_purpose(_), do: {"personal_memory", "relationship_specific", "prefer"}

  defp iso(nil), do: nil
  defp iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp iso(value) when is_binary(value), do: value
  defp iso(_), do: nil
end
