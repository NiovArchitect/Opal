defmodule OpalCore.RelationshipAccess.Templates do
  @moduledoc """
  Suggested starting policies per relationship template.

  Templates never auto-apply on type change. User must accept diffs.
  Sensitive categories default to use-without-disclose where suggested.
  """

  @type suggested :: %{
          data_category: String.t(),
          access_level: String.t(),
          action_ceiling: String.t(),
          visibility: String.t()
        }

  @doc "Canonical template keys (authority list)."
  def template_keys do
    ~w(
      romantic_partner
      spouse
      parent_to_child
      child_to_parent
      sibling
      family
      close_friend
      friend
      acquaintance
      coworker
      manager_professional
      business_partner
      church_community
      group
      custom
    )
  end

  @doc "Map RU-1 relationship type → default template key (suggestion only)."
  def from_ru1_type("spouse"), do: "spouse"
  def from_ru1_type("partner"), do: "romantic_partner"
  def from_ru1_type("family"), do: "family"
  def from_ru1_type("close_friend"), do: "close_friend"
  def from_ru1_type("friend"), do: "friend"
  def from_ru1_type("business"), do: "coworker"
  def from_ru1_type("acquaintance"), do: "acquaintance"
  def from_ru1_type(_), do: "custom"

  @doc "Suggested grants for a template. Empty for custom."
  def suggestions("custom"), do: []

  def suggestions("acquaintance") do
    [
      row("plans_commitments", "observe", "suggest", "self_only")
    ]
  end

  def suggestions("coworker") do
    [
      row("plans_commitments", "use", "prepare", "relationship"),
      row("calendar_availability", "use", "suggest", "relationship")
    ]
  end

  def suggestions("manager_professional"), do: suggestions("coworker")

  def suggestions("business_partner") do
    [
      row("plans_commitments", "use", "prepare", "relationship"),
      row("calendar_availability", "use", "prepare", "relationship"),
      row("shared_experiences", "observe", "suggest", "relationship")
    ]
  end

  def suggestions("friend") do
    [
      row("plans_commitments", "use", "prepare", "relationship"),
      row("preferences_interests", "use", "suggest", "relationship"),
      row("shared_experiences", "use", "suggest", "relationship"),
      row("conversation_signals", "observe", "suggest", "self_only"),
      row("call_signals", "none", "none", "self_only")
    ]
  end

  def suggestions("close_friend") do
    suggestions("friend") ++
      [
        row("conversation_signals", "use", "suggest", "self_only"),
        row("gifts_favorites", "use", "suggest", "self_only"),
        row("call_signals", "observe", "suggest", "self_only")
      ]
  end

  def suggestions("family") do
    [
      row("plans_commitments", "use", "prepare", "group"),
      row("family_private", "use", "suggest", "self_only"),
      row("calendar_availability", "use", "suggest", "group"),
      row("shared_experiences", "use", "suggest", "group")
    ]
  end

  def suggestions("sibling"), do: suggestions("family")

  def suggestions("parent_to_child") do
    [
      row("location_live", "use", "suggest", "relationship"),
      row("plans_commitments", "use", "prepare", "relationship"),
      row("calendar_availability", "use", "suggest", "relationship"),
      row("family_private", "use", "suggest", "self_only")
    ]
  end

  def suggestions("child_to_parent") do
    [
      row("plans_commitments", "use", "suggest", "relationship"),
      row("calendar_availability", "observe", "suggest", "relationship"),
      row("location_live", "observe", "suggest", "self_only")
    ]
  end

  def suggestions("church_community") do
    [
      row("plans_commitments", "use", "prepare", "group"),
      row("shared_experiences", "use", "suggest", "group"),
      row("preferences_interests", "observe", "suggest", "self_only")
    ]
  end

  def suggestions("group") do
    [
      row("plans_commitments", "use", "prepare", "group"),
      row("shared_experiences", "use", "suggest", "group")
    ]
  end

  def suggestions("romantic_partner"), do: partnerish()
  def suggestions("spouse"), do: partnerish()

  def suggestions(_), do: []

  defp partnerish do
    [
      row("plans_commitments", "use", "prepare", "relationship"),
      row("calendar_availability", "use", "prepare", "relationship"),
      row("shared_experiences", "use", "suggest", "relationship"),
      row("preferences_interests", "use", "suggest", "relationship"),
      row("conversation_signals", "use", "suggest", "self_only"),
      row("call_signals", "use", "suggest", "self_only"),
      row("gifts_favorites", "use", "suggest", "self_only"),
      # Financial: use for alignment, NOT disclose by default
      row("financial_context", "use", "suggest", "self_only"),
      row("location_live", "observe", "suggest", "self_only"),
      row("health_fitness", "observe", "suggest", "self_only")
    ]
  end

  defp row(cat, access, ceiling, vis) do
    %{
      data_category: cat,
      access_level: access,
      action_ceiling: ceiling,
      visibility: vis
    }
  end
end
