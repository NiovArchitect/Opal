defmodule OpalCore.SocialFlow.Execution.CoordinationResidue do
  @moduledoc """
  Human Coordination Residue — core dogfood / pilot metric.

  Coordination work that remains after Opal has done everything it
  legitimately can.

  Goal is NOT zero human involvement.
  Goal is zero UNNECESSARY coordination residue.

  Types:
  - irreducible_human_authority — desire, consent, meaningful preference, pay, share
  - missing_intelligence — Opal could know but doesn't yet
  - missing_permission — user denied/withheld capability
  - missing_integration — provider/device not live
  - execution_limitation — handoff-only, client contract
  - product_defect — should have worked with existing truth
  - user_preference — human chose manual path
  - desirable_human_choice — meaningful tradeoff (keep)
  """

  @types ~w(
    irreducible_human_authority
    missing_intelligence
    missing_permission
    missing_integration
    execution_limitation
    product_defect
    user_preference
    desirable_human_choice
  )

  def types, do: @types

  @doc "True if residue should shrink as compound alignment matures."
  def avoidable?(type) when type in @types do
    type in ~w(
      missing_intelligence
      missing_permission
      missing_integration
      execution_limitation
      product_defect
    )
  end

  def avoidable?(_), do: false

  @doc "True if residue is good/healthy human agency."
  def desirable?(type) when type in ~w(irreducible_human_authority desirable_human_choice),
    do: true

  def desirable?(_), do: false

  @doc """
  Classify a remaining human action after an alignment episode.

  action examples: check_schedule, follow_up, search_venue, open_maps,
  copy_address, check_hours, book, remind, clarify_roster, choose_tradeoff
  """
  def classify(action, context \\ %{})

  def classify(action, context) when is_binary(action) or is_atom(action) do
    a = to_string(action)
    c = stringify(context)

    type =
      cond do
        a in ~w(yes_want_to_see_you no_not_tonight choose_meaningful_tradeoff share_authorize book_authorize pay_authorize social_set_authority) ->
          "irreducible_human_authority"

        a in ~w(choose_romantic_tradeoff pick_among_genuine_options) ->
          "desirable_human_choice"

        a in ~w(check_schedule re_ask_when) and c["native_commitment_known"] == true ->
          "product_defect"

        a in ~w(check_schedule re_ask_when) ->
          "missing_intelligence"

        a in ~w(open_maps copy_address) and c["destination_resolved"] == true ->
          "product_defect"

        a in ~w(open_maps copy_address) ->
          "execution_limitation"

        a in ~w(search_venue browse_list) and c["provider_live"] == true ->
          "product_defect"

        a in ~w(search_venue browse_list) ->
          "missing_integration"

        a in ~w(remind follow_up_silent) and c["reminder_capable"] == true ->
          "product_defect"

        a in ~w(remind follow_up_silent) ->
          "missing_integration"

        a == "book" and c["handoff_available"] == true ->
          "execution_limitation"

        a == "book" ->
          "missing_integration"

        c["permission_denied"] == true ->
          "missing_permission"

        c["user_chose_manual"] == true ->
          "user_preference"

        true ->
          "missing_intelligence"
      end

    %{
      "action" => a,
      "type" => type,
      "avoidable" => avoidable?(type),
      "desirable" => desirable?(type),
      "irreducible" => type == "irreducible_human_authority",
      "authorizes_set" => false
    }
  end

  def classify(_, _), do: %{"type" => "missing_intelligence", "avoidable" => true}

  @doc """
  Score an episode: list of remaining actions + context.
  """
  def episode(actions, context \\ %{}) when is_list(actions) do
    classified = Enum.map(actions, &classify(&1, context))

    avoidable = Enum.filter(classified, & &1["avoidable"])
    irreducible = Enum.filter(classified, & &1["irreducible"])
    desirable = Enum.filter(classified, & &1["desirable"])

    %{
      "total" => length(classified),
      "avoidable_count" => length(avoidable),
      "irreducible_count" => length(irreducible),
      "desirable_count" => length(desirable),
      "items" => classified,
      "by_type" =>
        classified
        |> Enum.group_by(& &1["type"])
        |> Map.new(fn {k, v} -> {k, length(v)} end),
      "target" => "zero_unnecessary_residue",
      "not_target" => "zero_human_involvement"
    }
  end

  @doc """
  Residue reduction between plan episodes (e.g. Plan 1 vs Plan 10).
  """
  def reduction(earlier_episode, later_episode)
      when is_map(earlier_episode) and is_map(later_episode) do
    e = earlier_episode["avoidable_count"] || 0
    l = later_episode["avoidable_count"] || 0

    %{
      "earlier_avoidable" => e,
      "later_avoidable" => l,
      "avoidable_delta" => e - l,
      "improved" => l < e,
      "irreducible_preserved" =>
        (later_episode["irreducible_count"] || 0) >= 0,
      "pass" => l <= e
    }
  end

  def reduction(_, _), do: %{"pass" => false}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
