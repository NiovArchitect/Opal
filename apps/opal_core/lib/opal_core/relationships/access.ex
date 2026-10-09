defmodule OpalCore.Relationships.Access do
  @moduledoc """
  Paste I Access (A1–A8) — visibility scopes by relationship type.

  Enforced at API + prompt layers. Labels are one-directional: A's type for B
  never appears in B's contracts (0.5 asymmetry).
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Relationships
  alias OpalCore.Relationships.Behavior
  alias OpalCore.SocialFlow.{PlanParticipant, SharedPlan}

  @inner ~w(spouse partner family close_friend)
  @work ~w(business)
  @distant ~w(acquaintance)

  @doc "Visibility tier for how viewer relates to subject (viewer's OWN label)."
  def tier(viewer_id, subject_id) when is_binary(viewer_id) and is_binary(subject_id) do
    case Relationships.get_type(viewer_id, subject_id) do
      t when t in @inner -> :inner
      "friend" -> :social
      t when t in @work -> :work
      t when t in @distant -> :distant
      nil -> :unset
      _ -> :social
    end
  end

  def tier(_, _), do: :unset

  @doc """
  Whether viewer may see a plan owned/created in subject's world.

  Rules:
  - Shared plan (viewer is PlanParticipant) → always visible (explicit share)
  - Inner circle → weekend / availability-hint plans of subject (shared social)
  - Work → only plans tagged work / explicitly shared with viewer
  - Distant → only explicitly shared
  - Family group porous: family-typed members see family-scoped plans; never
    outsider 1:1 plans
  """
  def can_see_plan?(viewer_id, %SharedPlan{} = plan, opts \\ []) do
    participants = participant_ids(plan.id)

    cond do
      viewer_id in participants ->
        true

      Keyword.get(opts, :explicit_share) == true ->
        true

      true ->
        creator = plan.created_by_user_id
        scope = plan_scope(plan)
        t = tier(viewer_id, creator)

        my_type = Relationships.get_type(viewer_id, creator)

        cond do
          # Family porous internally for family-scoped plans
          my_type == "family" and scope == :family ->
            true

          t == :inner and scope in [:weekend, :social, :family, :shared] ->
            true

          t == :social and scope in [:social, :shared, :weekend] ->
            true

          t == :work and scope == :work ->
            true

          scope == :private_1_1 ->
            false

          t in [:work, :distant, :unset] ->
            false

          true ->
            false
        end
    end
  end

  def can_see_plan?(_, _, _), do: false

  @doc "Filter plans list for a viewer (API enforcement)."
  def visible_plans(viewer_id, plans, opts \\ []) when is_list(plans) do
    Enum.filter(plans, &can_see_plan?(viewer_id, &1, opts))
  end

  @doc """
  Prompt context slice for cross-type planning (A3).

  When planning with a business contact, strip personal WHY / private plan
  titles — only shared availability windows / work-scoped facts.
  """
  def prompt_plan_facts(viewer_id, subject_id, plans) when is_list(plans) do
    t = tier(viewer_id, subject_id)

    plans
    |> Enum.filter(&can_see_plan?(viewer_id, &1))
    |> Enum.map(fn plan ->
      base = %{
        "plan_id" => plan.id,
        "status" => plan.status,
        "time_label" => plan.time_label
      }

      case t do
        :work ->
          # Never leak personal titles / locations as WHY
          Map.merge(base, %{
            "title" => if(plan_scope(plan) == :work, do: plan.title, else: "shared work plan"),
            "location" => if(plan_scope(plan) == :work, do: plan.location, else: nil),
            "personal_context" => false
          })

        :distant ->
          Map.merge(base, %{"title" => plan.title, "depth" => "minimal"})

        _ ->
          Map.merge(base, %{
            "title" => plan.title,
            "location" => plan.location,
            "personal_context" => plan_scope(plan) != :work
          })
      end
    end)
  end

  @doc "Acquaintance nudge depth (A4) — birthday ok; gifts/routines denied."
  def nudge_depth(type) when is_binary(type) do
    case type do
      t when t in @inner ->
        %{birthday: true, gift_suggestions: true, routine_tracking: true, depth: :rich}

      "friend" ->
        %{birthday: true, gift_suggestions: false, routine_tracking: true, depth: :standard}

      t when t in @work ->
        %{birthday: false, gift_suggestions: false, routine_tracking: false, depth: :minimal}

      t when t in @distant ->
        %{birthday: true, gift_suggestions: false, routine_tracking: false, depth: :minimal}

      _ ->
        %{birthday: false, gift_suggestions: false, routine_tracking: false, depth: :none}
    end
  end

  def nudge_depth(_), do: %{birthday: false, gift_suggestions: false, routine_tracking: false, depth: :none}

  @doc """
  Asymmetry safe contract (0.5 / A7): what viewer may know about subject.

  Never includes subject's label for viewer. Never includes "they think of you as".
  """
  def viewer_safe_relationship_contract(viewer_id, subject_id) do
    my_type = Relationships.get_type(viewer_id, subject_id)
    bounds = if my_type, do: Behavior.resolved_bounds(viewer_id, subject_id), else: %{}

    %{
      "contact_user_id" => subject_id,
      "my_type" => my_type,
      "my_bounds" => bounds,
      # Explicitly absent — never compute the reverse label for UX
      "their_type_for_me" => nil,
      "asymmetry_visible" => false
    }
  end

  @doc "Assert reverse label is not present in any map/string (test helper shape)."
  def leaks_reverse_label?(payload, forbidden_type) when is_binary(forbidden_type) do
    blob = inspect(payload) |> String.downcase()
    # Cruel patterns
    String.contains?(blob, "thinks of you") or
      String.contains?(blob, "their_type_for_me => \"#{forbidden_type}\"") or
      String.contains?(blob, "\"their_type_for_me\" => \"#{forbidden_type}\"")
  end

  def plan_scope(%SharedPlan{} = plan) do
    align = plan.alignment || %{}
    source = plan.source || ""
    title = String.downcase(plan.title || "")
    loc = String.downcase(plan.location || "")

    cond do
      align["scope"] in ["work", :work] or align["work"] == true -> :work
      align["scope"] in ["family", :family] -> :family
      align["scope"] in ["private", :private, "private_1_1"] -> :private_1_1
      align["weekend"] == true or weekendish?(title) -> :weekend
      String.contains?(title, "offsite") or String.contains?(title, "standup") -> :work
      String.contains?(title, "reunion") or String.contains?(title, "soccer") -> :family
      source == "conversation" and align["private"] == true -> :private_1_1
      true -> :social
    end
  end

  defp weekendish?(title) do
    String.contains?(title, "saturday") or String.contains?(title, "sunday") or
      String.contains?(title, "weekend")
  end

  defp participant_ids(plan_id) do
    from(p in PlanParticipant, where: p.plan_id == ^plan_id, select: p.user_id)
    |> Repo.all()
  end
end
