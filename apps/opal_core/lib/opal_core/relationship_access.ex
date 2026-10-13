defmodule OpalCore.RelationshipAccess do
  @moduledoc """
  Relationship Access Model substrate.

  - Multi-dimensional grants (use ≠ disclose)
  - Standing Graphing policy with global pause
  - Templates are suggestions; type change never silent-escalates
  - Pass 2 Understanding Candidates remain inactive
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.RelationshipAccess.{Grant, GraphingPolicy, Templates}

  @access_rank %{"none" => 0, "observe" => 1, "use" => 2, "disclose" => 3}
  @ceiling_rank %{"none" => 0, "suggest" => 1, "prepare" => 2, "execute" => 3}

  # ---------------------------------------------------------------------------
  # Graphing policy
  # ---------------------------------------------------------------------------

  def get_or_create_graphing_policy(owner_user_id) when is_binary(owner_user_id) do
    case Repo.get_by(GraphingPolicy, owner_user_id: owner_user_id) do
      %GraphingPolicy{} = p ->
        {:ok, p}

      nil ->
        %GraphingPolicy{}
        |> GraphingPolicy.changeset(%{
          owner_user_id: owner_user_id,
          call_mode: "ask_each",
          chat_mode: "ask_each",
          global_paused: false,
          other_party_disclosure_required: true,
          audit: %{"created_by" => "relationship_access_default"}
        })
        |> Repo.insert()
    end
  end

  def update_graphing_policy(owner_user_id, attrs) when is_binary(owner_user_id) and is_map(attrs) do
    with {:ok, policy} <- get_or_create_graphing_policy(owner_user_id) do
      attrs =
        attrs
        |> Map.take([
          "call_mode",
          "chat_mode",
          "global_paused",
          "other_party_disclosure_required",
          :call_mode,
          :chat_mode,
          :global_paused,
          :other_party_disclosure_required
        ])
        |> stringify_keys()
        |> maybe_stamp_pause()

      policy
      |> GraphingPolicy.changeset(Map.put(attrs, "owner_user_id", owner_user_id))
      |> Repo.update()
    end
  end

  defp maybe_stamp_pause(%{"global_paused" => true} = attrs) do
    Map.put(attrs, "paused_at", DateTime.utc_now())
  end

  defp maybe_stamp_pause(%{"global_paused" => false} = attrs) do
    Map.put(attrs, "paused_at", nil)
  end

  defp maybe_stamp_pause(attrs), do: attrs

  @doc """
  Whether Graphing may run for a channel/contact under standing policy.

  Returns `{:ok, :auto | :ask | :selected}` or `{:error, reason}`.
  Never activates Understanding Candidates.
  """
  def graphing_decision(owner_user_id, channel, contact_user_id \\ nil)
      when channel in [:call, :chat, "call", "chat"] do
    channel = if is_binary(channel), do: String.to_existing_atom(channel), else: channel

    with {:ok, policy} <- get_or_create_graphing_policy(owner_user_id) do
      cond do
        policy.global_paused ->
          {:error, :global_paused}

        true ->
          mode = if channel == :call, do: policy.call_mode, else: policy.chat_mode
          decide_mode(mode, owner_user_id, channel, contact_user_id, policy)
      end
    end
  end

  defp decide_mode("never", _, _, _, _), do: {:error, :never}

  defp decide_mode("ask_each", _, _, _, policy) do
    {:ok, :ask, meta(policy)}
  end

  defp decide_mode("auto_eligible", owner, channel, contact, policy) do
    cat = if channel == :call, do: "call_signals", else: "conversation_signals"

    # Person-agnostic: if a contact is named, require that edge's observe grant.
    # If no contact yet (unknown callee), standing auto still yields :auto with disclosure flag.
    cond do
      is_binary(contact) and not may_access?(owner, contact, cat, "observe") ->
        {:error, :relationship_denied}

      true ->
        {:ok, :auto, meta(policy)}
    end
  end

  defp decide_mode("selected_only", owner, channel, contact, policy) do
    cat = if channel == :call, do: "call_signals", else: "conversation_signals"

    cond do
      is_nil(contact) ->
        {:error, :contact_required}

      may_access?(owner, contact, cat, "observe") ->
        {:ok, :selected, meta(policy)}

      true ->
        {:error, :relationship_denied}
    end
  end

  defp decide_mode(_, _, _, _, _), do: {:error, :invalid_mode}

  defp meta(policy) do
    %{
      other_party_disclosure_required: policy.other_party_disclosure_required,
      indicator: "Opal Graphing"
    }
  end

  # ---------------------------------------------------------------------------
  # Grants CRUD
  # ---------------------------------------------------------------------------

  def list_grants(owner_user_id, opts \\ []) when is_binary(owner_user_id) do
    include_revoked? = Keyword.get(opts, :include_revoked, false)
    contact = Keyword.get(opts, :contact_user_id)

    Grant
    |> where([g], g.owner_user_id == ^owner_user_id)
    |> then(fn q ->
      if include_revoked?, do: q, else: where(q, [g], is_nil(g.revoked_at))
    end)
    |> then(fn q ->
      if is_binary(contact), do: where(q, [g], g.contact_user_id == ^contact), else: q
    end)
    |> order_by([g], asc: g.data_category)
    |> Repo.all()
  end

  def upsert_grant(owner_user_id, attrs) when is_binary(owner_user_id) and is_map(attrs) do
    attrs =
      attrs
      |> stringify_keys()
      |> Map.put("owner_user_id", owner_user_id)
      |> Map.put_new("granted_at", DateTime.utc_now())
      |> Map.put_new("source", "explicit")
      |> Map.put_new("visibility", "self_only")
      |> Map.put_new("access_level", "none")
      |> Map.put_new("action_ceiling", "none")

    scope_kind = attrs["scope_kind"]
    contact = attrs["contact_user_id"]
    group = attrs["group_id"]
    category = attrs["data_category"]

    existing =
      Grant
      |> where([g], g.owner_user_id == ^owner_user_id)
      |> where([g], g.scope_kind == ^scope_kind)
      |> where([g], g.data_category == ^category)
      |> where([g], is_nil(g.revoked_at))
      |> then(fn q ->
        cond do
          scope_kind == "contact" and is_binary(contact) ->
            where(q, [g], g.contact_user_id == ^contact)

          scope_kind == "group" and not is_nil(group) ->
            where(q, [g], g.group_id == ^group)

          scope_kind == "global" ->
            where(q, [g], is_nil(g.contact_user_id) and is_nil(g.group_id))

          true ->
            where(q, [g], false)
        end
      end)
      |> Repo.one()

    case existing do
      %Grant{} = g ->
        g
        |> Grant.changeset(Map.put(attrs, "revoked_at", nil))
        |> Repo.update()

      nil ->
        %Grant{}
        |> Grant.changeset(attrs)
        |> Repo.insert()
    end
  end

  def revoke_grant(owner_user_id, grant_id) when is_binary(owner_user_id) and is_binary(grant_id) do
    case Repo.get(Grant, grant_id) do
      %Grant{owner_user_id: ^owner_user_id, revoked_at: nil} = g ->
        g
        |> Grant.changeset(%{revoked_at: DateTime.utc_now()})
        |> Repo.update()

      %Grant{owner_user_id: ^owner_user_id} = g ->
        {:ok, g}

      %Grant{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  @doc """
  Apply template suggestions for a contact. Never silent-escalates existing grants.
  Only inserts missing categories or upgrades when `allow_upgrade` is true AND
  the user explicitly requested apply (caller must pass allow_upgrade: true).
  Default: fill gaps only (never raise access_level / action_ceiling).
  """
  def apply_template(owner_user_id, contact_user_id, template_key, opts \\ [])
      when is_binary(owner_user_id) and is_binary(contact_user_id) and is_binary(template_key) do
    allow_upgrade? = Keyword.get(opts, :allow_upgrade, false)
    suggestions = Templates.suggestions(template_key)

    results =
      Enum.map(suggestions, fn s ->
        existing =
          list_grants(owner_user_id, contact_user_id: contact_user_id)
          |> Enum.find(&(&1.data_category == s.data_category))

        cond do
          is_nil(existing) ->
            upsert_grant(owner_user_id, %{
              "scope_kind" => "contact",
              "contact_user_id" => contact_user_id,
              "data_category" => s.data_category,
              "access_level" => s.access_level,
              "action_ceiling" => s.action_ceiling,
              "visibility" => s.visibility,
              "source" => "template",
              "template_key" => template_key,
              "audit" => %{"applied_template" => template_key}
            })

          allow_upgrade? and rank_access(s.access_level) > rank_access(existing.access_level) ->
            upsert_grant(owner_user_id, %{
              "scope_kind" => "contact",
              "contact_user_id" => contact_user_id,
              "data_category" => s.data_category,
              "access_level" => s.access_level,
              "action_ceiling" => s.action_ceiling,
              "visibility" => s.visibility,
              "source" => "explicit",
              "template_key" => template_key,
              "audit" => %{"upgraded_from_template" => template_key}
            })

          true ->
            # Keep existing — no silent escalate
            {:ok, existing}
        end
      end)

    {:ok, Enum.map(results, fn {:ok, g} -> g end)}
  end

  @doc """
  When RU-1 type changes: return template diff for review. Do NOT auto-apply.
  """
  def template_diff_on_type_change(owner_user_id, contact_user_id, new_ru1_type) do
    key = Templates.from_ru1_type(new_ru1_type)
    suggested = Templates.suggestions(key)
    current = list_grants(owner_user_id, contact_user_id: contact_user_id)

    current_map = Map.new(current, &{&1.data_category, &1})

    additions =
      Enum.filter(suggested, fn s ->
        case current_map[s.data_category] do
          nil -> true
          g -> rank_access(s.access_level) > rank_access(g.access_level)
        end
      end)

    %{
      "template_key" => key,
      "auto_applied" => false,
      "requires_user_accept" => true,
      "proposed_additions" =>
        Enum.map(additions, fn s ->
          %{
            "data_category" => s.data_category,
            "access_level" => s.access_level,
            "action_ceiling" => s.action_ceiling,
            "visibility" => s.visibility
          }
        end)
    }
  end

  # ---------------------------------------------------------------------------
  # Authorization
  # ---------------------------------------------------------------------------

  @doc "May owner use/observe/disclose category for contact? Global pause blocks Graphing cats."
  def may_access?(owner_user_id, contact_user_id, data_category, min_level \\ "observe")

  def may_access?(owner_user_id, contact_user_id, data_category, min_level)
      when is_binary(owner_user_id) and is_binary(data_category) do
    min = rank_access(min_level)

    grants =
      Grant
      |> where([g], g.owner_user_id == ^owner_user_id)
      |> where([g], g.data_category == ^data_category)
      |> where([g], is_nil(g.revoked_at))
      |> where(
        [g],
        (g.scope_kind == "contact" and g.contact_user_id == ^contact_user_id) or
          g.scope_kind == "global"
      )
      |> Repo.all()
      |> Enum.filter(&Grant.active?/1)

    Enum.any?(grants, fn g -> rank_access(g.access_level) >= min end)
  end

  def may_access?(_, _, _, _), do: false

  @doc """
  May a signal be **disclosed** to another party?
  Use without disclose is the default for sensitive categories.
  """
  def may_disclose?(owner_user_id, contact_user_id, data_category) do
    may_access?(owner_user_id, contact_user_id, data_category, "disclose")
  end

  @doc """
  Private alignment use: may shape Suggest/Prepare using a category without disclosing it.
  """
  def may_use_privately?(owner_user_id, contact_user_id, data_category) do
    may_access?(owner_user_id, contact_user_id, data_category, "use") and
      not may_disclose?(owner_user_id, contact_user_id, data_category)
  end

  @doc """
  Effective action ceiling for a category in a relationship (or global).

  Owner-solo planning default: when `contact_user_id` is nil and category is
  `plans_commitments`, missing grants allow up to `prepare` (Suggest/Prepare
  for the owner's own day). Execute still requires an explicit grant.
  Relationship-scoped categories default to `none` until granted.
  """
  def action_ceiling(owner_user_id, data_category, contact_user_id \\ nil) do
    grants =
      Grant
      |> where([g], g.owner_user_id == ^owner_user_id)
      |> where([g], g.data_category == ^data_category)
      |> where([g], is_nil(g.revoked_at))
      |> then(fn q ->
        if is_binary(contact_user_id) do
          where(
            q,
            [g],
            (g.scope_kind == "contact" and g.contact_user_id == ^contact_user_id) or
              g.scope_kind == "global"
          )
        else
          where(q, [g], g.scope_kind == "global")
        end
      end)
      |> Repo.all()
      |> Enum.filter(&Grant.active?/1)

    case grants do
      [] when is_nil(contact_user_id) and data_category == "plans_commitments" ->
        "prepare"

      [] ->
        "none"

      list ->
        Enum.map(list, & &1.action_ceiling) |> Enum.max_by(&rank_ceiling/1, fn -> "none" end)
    end
  end

  @doc """
  Whether an action is allowed under ceiling.
  Returns `:ok` | `{:error, :above_ceiling | :permission_denied}`.
  Never paints success when denied.
  """
  def authorize_action(owner_user_id, data_category, requested_ceiling, contact_user_id \\ nil)
      when requested_ceiling in ["none", "suggest", "prepare", "execute"] do
    effective = action_ceiling(owner_user_id, data_category, contact_user_id)

    if rank_ceiling(requested_ceiling) <= rank_ceiling(effective) do
      :ok
    else
      {:error, :above_ceiling}
    end
  end

  @doc """
  Group grants do not inherit member private contexts.
  """
  def group_may_access?(owner_user_id, group_id, data_category, min_level \\ "observe") do
    min = rank_access(min_level)

    Grant
    |> where([g], g.owner_user_id == ^owner_user_id)
    |> where([g], g.scope_kind == "group")
    |> where([g], g.group_id == ^group_id)
    |> where([g], g.data_category == ^data_category)
    |> where([g], is_nil(g.revoked_at))
    |> Repo.all()
    |> Enum.filter(&Grant.active?/1)
    |> Enum.any?(fn g -> rank_access(g.access_level) >= min end)
  end

  def templates, do: Templates

  defp rank_access(level), do: Map.get(@access_rank, to_string(level), 0)
  defp rank_ceiling(level), do: Map.get(@ceiling_rank, to_string(level), 0)

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
