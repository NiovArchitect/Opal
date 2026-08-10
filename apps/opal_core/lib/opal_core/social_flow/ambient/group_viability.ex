defmodule OpalCore.SocialFlow.Ambient.GroupViability do
  @moduledoc """
  Group viability — not pure majority voting.

  Optional non-participation must not collapse everyone else's alignment.
  Required participants still matter (birthday person, driver, host, etc.).

  Never shames holdouts. No permanent "bad participant" score.
  Composes with AsymmetricParticipation / AlignmentParticipation.
  """

  alias OpalCore.SocialFlow.AsymmetricParticipation
  alias OpalCore.SocialFlow.Ambient.HardConstraints

  @roles ~w(required optional undecided declined silent)

  def roles, do: @roles

  @doc """
  Evaluate whether a plan can proceed given participation roles.

  participants: list of maps with user_id, role, response, engagement
  opts:
  - agreement_policy: "majority_or_organizer" | "unanimity" | "quorum"
  - min_viable: integer minimum attendance
  - purpose: "date" | "friends" | "birthday" | ...
  """
  def evaluate(participants, opts \\ [])

  def evaluate(participants, opts) when is_list(participants) do
    people = Enum.map(participants, &normalize/1)
    policy = to_string(Keyword.get(opts, :agreement_policy, "majority_or_organizer"))
    min_viable = Keyword.get(opts, :min_viable)
    purpose = to_string(Keyword.get(opts, :purpose, "general"))

    required = Enum.filter(people, &(&1["role"] == "required"))
    in_ids = Enum.filter(people, &in?/1) |> Enum.map(& &1["user_id"])
    out_ids = Enum.filter(people, &out?/1) |> Enum.map(& &1["user_id"])
    maybe_ids = Enum.filter(people, &maybe?/1) |> Enum.map(& &1["user_id"])

    required_missing =
      required
      |> Enum.reject(&in?/1)
      |> Enum.map(& &1["user_id"])

    required_ok? = required_missing == []

    min_needed =
      cond do
        is_integer(min_viable) -> min_viable
        purpose in ~w(date dyad study_pair) -> 2
        purpose == "birthday" -> max(length(required), 1)
        true -> default_quorum(length(people), purpose)
      end

    count_in = length(in_ids)
    quorum_met? = count_in >= min_needed

    asym =
      AsymmetricParticipation.can_proceed?(
        Enum.map(people, & &1["engagement"]),
        agreement_policy: policy
      )

    social_viable? =
      case policy do
        "unanimity" ->
          required_ok? and Enum.all?(people, &in?/1)

        "quorum" ->
          required_ok? and quorum_met?

        _ ->
          # majority_or_organizer / default: required must be in; optional may miss
          required_ok? and quorum_met? and (asym or count_in >= min_needed)
      end

    {:ok, hard} =
      HardConstraints.evaluate(%{
        hard_constraints: Keyword.get(opts, :hard_constraints, []),
        failed_hard: Keyword.get(opts, :failed_hard, [])
      })

    base = %{
      "viable" => social_viable?,
      "required_ok" => required_ok?,
      "required_missing" => required_missing,
      "quorum_met" => quorum_met?,
      "min_viable" => min_needed,
      "in_count" => count_in,
      "in_ids" => in_ids,
      "out_ids" => out_ids,
      "maybe_ids" => maybe_ids,
      "optional_may_miss" => true,
      "optional_veto" => false,
      "shame_holdout" => false,
      "permanent_penalty" => false,
      "authorizes_set" => false,
      "shared_safe" => shared_safe(social_viable?, required_ok?, count_in, min_needed),
      "private_roles_leaked" => false
    }

    {:ok, HardConstraints.apply_to_viability(base, hard)}
  end

  def evaluate(_, _), do: {:ok, %{"viable" => false}}

  @doc """
  Late join: include if capacity allows without breaking confirmed plan.
  """
  def late_join(viability, joiner_id, opts \\ [])

  def late_join(viability, joiner_id, opts) when is_map(viability) do
    v = stringify(viability)
    capacity = Keyword.get(opts, :provider_capacity_remaining, 99)
    confirmed? = Keyword.get(opts, :plan_confirmed, false)
    tickets = Keyword.get(opts, :tickets_remaining, capacity)
    rebook? = Keyword.get(opts, :auto_rebook, false)

    cap_ok = capacity > 0 and tickets > 0

    can? =
      cap_ok and is_binary(joiner_id) and
        (not confirmed? or Keyword.get(opts, :allow_late_join, true))

    {:ok,
     %{
       "can_join" => can?,
       "joiner_id" => joiner_id,
       "breaks_confirmed_plan" => false,
       "provider_capacity_remaining" => max(capacity - if(can?, do: 1, else: 0), 0),
       "smooth_include" => can?,
       "auto_rebooked" => false,
       "rebook_required" => can? == false and rebook? == false and confirmed?,
       "prior_in_count" => v["in_count"],
       "authorizes_set" => false
     }}
  end

  @doc """
  Late decline: re-evaluate only what depends on leaver. Do not auto-restart.
  """
  def late_decline(participants, leaver_id, opts \\ []) when is_list(participants) do
    leaver =
      participants
      |> Enum.map(&normalize/1)
      |> Enum.find(&(&1["user_id"] == leaver_id))

    was_required? = leaver && leaver["role"] == "required"

    remaining =
      Enum.map(participants, fn p ->
        n = normalize(p)

        if n["user_id"] == leaver_id do
          Map.put(n, "response", "not_this_time")
        else
          n
        end
      end)

    with {:ok, v} <- evaluate(remaining, opts) do
      preserve =
        ~w(time place preferences location conversation_intent)
        |> Map.new(&{&1, true})

      {:ok,
       Map.merge(v, %{
         "leaver_id" => leaver_id,
         "was_required" => was_required? == true,
         "restart_entire_plan" => false,
         "graceful_miss" => was_required? != true,
         "re_enter_future_ok" => true,
         "context_preserved" => preserve,
         "recovery" =>
           if(was_required? == true,
             do: "reschedule_or_new_purpose",
             else: "continue"
           )
       })}
    end
  end

  @doc "Reject shared copy that shames holdouts."
  def holdout_shame?(text) when is_binary(text) do
    lower = String.downcase(text)

    Enum.any?(
      [
        "waiting on",
        "holding this up",
        "everyone except",
        "never responded",
        "is the problem",
        "ruining"
      ],
      &String.contains?(lower, &1)
    )
  end

  def holdout_shame?(_), do: false

  defp shared_safe(true, true, count, min) when count >= min do
    %{
      "shared_safe" => true,
      "benefit_copy" => "This works for enough of the group.",
      "no_names" => true,
      "no_holdout_shame" => true
    }
  end

  defp shared_safe(false, false, _, _) do
    %{
      "shared_safe" => true,
      "benefit_copy" => "This may need another approach.",
      "no_names" => true,
      "no_holdout_shame" => true
    }
  end

  defp shared_safe(_, _, _, _) do
    %{
      "shared_safe" => true,
      "benefit_copy" => "Still forming.",
      "no_names" => true,
      "no_holdout_shame" => true
    }
  end

  defp default_quorum(n, _) when n <= 2, do: n
  defp default_quorum(n, "friends") when n >= 5, do: max(3, div(n, 2))
  defp default_quorum(n, _) when n >= 4, do: max(2, div(n + 1, 2))
  defp default_quorum(n, _), do: max(1, n - 1)

  defp normalize(p) when is_map(p) do
    a = stringify(p)

    role =
      cond do
        a["required"] == true -> "required"
        a["role"] in ~w(required optional) -> to_string(a["role"])
        # material roles (host/driver/…) still use optional/required participation role
        a["participation_role"] -> to_string(a["participation_role"])
        true -> to_string(a["role"] || "optional")
      end

    # If role is a material dependency role, treat as required participation
    role =
      if role in ~w(host driver birthday ticket_holder payer), do: "required", else: role

    response = a["response"] || a["status"] || "undecided"
    engagement = a["engagement"] || "active"

    %{
      "user_id" => a["user_id"] || a["id"],
      "role" => to_string(role),
      "response" => to_string(response),
      "engagement" => engagement,
      "material_roles" => List.wrap(a["roles"] || a["material_roles"] || [])
    }
  end

  defp in?(%{"response" => r}) when r in ~w(im_in in yes affirmative confirmed), do: true
  defp in?(%{"response" => "maybe"}), do: false
  defp in?(_), do: false

  defp out?(%{"response" => r}) when r in ~w(not_this_time declined out no unavailable), do: true
  defp out?(_), do: false

  defp maybe?(%{"response" => r}) when r in ~w(maybe undecided silent need_another_time), do: true
  defp maybe?(_), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
