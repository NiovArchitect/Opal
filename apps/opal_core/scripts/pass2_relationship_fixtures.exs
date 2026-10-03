# Pass 2 A8 — deterministic Walk A/B relationship intelligence fixtures.
# Reuses RelationshipMemory / MemoryCandidate / DurablePreferenceMemory /
# Continuity / MemoryIntelligence only. No new schema.
#
#   cd apps/opal_core && mix run scripts/pass2_relationship_fixtures.exs
#   PASS2_RELATIONSHIP_FIXTURES=1 node scripts/pass2_relationship_fixtures.mjs
#
# Development-only. Idempotent via stable MemoryIntelligence / Continuity keys.

if Mix.env() not in [:dev, :test] do
  IO.puts("REFUSED: pass2_relationship_fixtures is development/test-only.")
  System.halt(1)
end

# Keep stdout machine-readable for the Node wrapper.
require Logger
Logger.configure(level: :warning)

alias OpalCore.Repo
alias OpalCore.Accounts.User
alias OpalCore.Messaging.ConversationMember

alias OpalCore.SocialFlow.{
  Continuity,
  DurablePreferenceMemory,
  FollowThrough,
  MemoryIntelligence,
  RelationshipMemory
}

import Ecto.Query

walk_a = "47aa5856-8c56-4b18-a4d4-6a9b456516a8"
walk_b = "b599fcd7-7a97-4736-8221-86e0a6d8dc7a"
fort_oak = "ace99adc-db67-4258-9d95-f612246c6c84"

report = %{
  "schema" => "pass2_relationship_fixtures.v1",
  "walk_a" => walk_a,
  "walk_b" => walk_b,
  "conversation_id" => fort_oak,
  "seeded" => [],
  "skipped" => [],
  "assertions" => %{},
  "ok" => true
}

put_seed = fn report, item ->
  Map.update!(report, "seeded", &[item | &1])
end

put_skip = fn report, item ->
  Map.update!(report, "skipped", &[item | &1])
end

put_assert = fn report, key, value ->
  Map.update!(report, "assertions", &Map.put(&1, key, value))
end

fail = fn report, reason ->
  report
  |> Map.put("ok", false)
  |> Map.put("error", reason)
end

ensure_users! = fn ->
  missing =
    [walk_a, walk_b]
    |> Enum.reject(fn id -> match?(%User{}, Repo.get(User, id)) end)

  if missing != [] do
    {:error, {:missing_users, missing}}
  else
    :ok
  end
end

ensure_members! = fn ->
  for uid <- [walk_a, walk_b] do
    unless Repo.exists?(
             from(m in ConversationMember,
               where: m.conversation_id == ^fort_oak and m.user_id == ^uid
             )
           ) do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: fort_oak, user_id: uid})
      |> Repo.insert!()
    end
  end

  :ok
end

case ensure_users!.() do
  {:error, reason} ->
    IO.puts(Jason.encode!(fail.(report, inspect(reason))))
    System.halt(1)

  :ok ->
    :ok
end

ensure_members!.()

resolve_promoted = fn cand, promoted ->
  cond do
    match?(%RelationshipMemory{}, promoted) ->
      promoted.id

    is_binary(cand.promoted_memory_id) ->
      cand.promoted_memory_id

    true ->
      from(m in RelationshipMemory,
        where:
          m.owner_user_id == ^cand.owner_user_id and m.deletion_state == "active" and
            m.summary == ^cand.candidate_summary,
        order_by: [desc: m.inserted_at],
        limit: 1,
        select: m.id
      )
      |> Repo.one()
  end
end

# 1) Partner ring size — Walk B private directional fact about Walk A (gift planning).
ring =
  MemoryIntelligence.consider(%{
    "owner_user_id" => walk_b,
    "subject_user_id" => walk_a,
    "counterpart_user_id" => walk_a,
    "conversation_id" => fort_oak,
    "memory_class" => "relationship_fact",
    "value" => "Walk A partner ring size is 6",
    "evidence_kind" => "explicit_statement",
    "source_type" => "chat",
    "idempotency_key" => "pass2-ring-size-b-about-a",
    "auto_promote" => true
  })

report =
  case ring do
    {:ok, %{candidate: cand, promoted: promoted}} ->
      put_seed.(report, %{
        "fact" => "partner_ring_size",
        "owner_user_id" => walk_b,
        "counterpart_user_id" => walk_a,
        "summary" => cand.candidate_summary,
        "candidate_id" => cand.id,
        "promoted_memory_id" => resolve_promoted.(cand, promoted),
        "visibility" => "private",
        "directional" => true
      })

    other ->
      fail.(report, "ring_size_seed_failed: #{inspect(other)}")
  end

# 2) Anniversary date — Walk A explicit relationship fact (private).
anniversary =
  MemoryIntelligence.consider(%{
    "owner_user_id" => walk_a,
    "subject_user_id" => walk_a,
    "counterpart_user_id" => walk_b,
    "conversation_id" => fort_oak,
    "memory_class" => "relationship_fact",
    "value" => "Anniversary with Walk B is June 14",
    "evidence_kind" => "explicit_statement",
    "source_type" => "chat",
    "idempotency_key" => "pass2-anniversary-a-june-14",
    "auto_promote" => true
  })

report =
  case anniversary do
    {:ok, %{candidate: cand, promoted: promoted}} ->
      put_seed.(report, %{
        "fact" => "anniversary_date",
        "owner_user_id" => walk_a,
        "counterpart_user_id" => walk_b,
        "summary" => cand.candidate_summary,
        "candidate_id" => cand.id,
        "promoted_memory_id" => resolve_promoted.(cand, promoted),
        "visibility" => "private",
        "explicit" => true
      })

    other ->
      fail.(report, "anniversary_seed_failed: #{inspect(other)}")
  end

# 3) Movie preference — Interstellar liked (DurablePreferenceMemory.remember_explicit).
# remember_explicit idempotency is place-purpose scoped; seed-level dedupe by summary.
movie_existing =
  from(m in RelationshipMemory,
    where:
      m.owner_user_id == ^walk_a and m.deletion_state == "active" and
        m.summary == "likes Interstellar",
    order_by: [desc: m.inserted_at],
    limit: 1
  )
  |> Repo.one()

movie =
  case movie_existing do
    %RelationshipMemory{} = mem ->
      {:ok, mem, :idempotent}

    nil ->
      DurablePreferenceMemory.remember_explicit(%{
        "owner_user_id" => walk_a,
        "preference" => "likes Interstellar",
        "counterpart_user_id" => walk_b,
        "conversation_id" => fort_oak,
        "purpose" => "interest",
        "weight_class" => "explicit_statement",
        "polarity" => "prefer"
      })
  end

report =
  case movie do
    {:ok, mem, tag} ->
      put_seed.(report, %{
        "fact" => "movie_preference_interstellar",
        "owner_user_id" => walk_a,
        "summary" => mem.summary,
        "memory_id" => mem.id,
        "tag" => to_string(tag),
        "visibility" => mem.visibility,
        "path" => "DurablePreferenceMemory.remember_explicit"
      })

    other ->
      fail.(report, "movie_seed_failed: #{inspect(other)}")
  end

# 4) Temporary "stay home tonight" — must NOT promote to durable homebody trait.
stay_home =
  DurablePreferenceMemory.remember_explicit(%{
    "owner_user_id" => walk_a,
    "preference" => "stay home tonight",
    "conversation_id" => fort_oak
  })

report =
  case stay_home do
    {:error, :episode_intent_not_durable} ->
      homebody_rows =
        from(m in RelationshipMemory,
          where:
            m.owner_user_id == ^walk_a and m.deletion_state == "active" and
              (ilike(m.summary, "%homebody%") or ilike(m.summary, "%stay home tonight%"))
        )
        |> Repo.all()

      put_seed.(
        put_assert.(report, "TEMPORARY_INTENT_NOT_PROMOTED_TO_DURABLE_TRAIT", %{
          "remember_explicit" => "episode_intent_not_durable",
          "homebody_or_tonight_durable_rows" => length(homebody_rows),
          "pass" => homebody_rows == []
        }),
        %{
          "fact" => "temporary_stay_home_tonight",
          "owner_user_id" => walk_a,
          "result" => "rejected_episode_intent_not_durable",
          "durable_trait_written" => false
        }
      )

    other ->
      fail.(report, "stay_home_should_reject: #{inspect(other)}")
  end

# 5) Child activity upcoming — Walk A/B are adult dyad fixtures without Family/youth link.
report =
  put_skip.(report, %{
    "fact" => "child_activity_upcoming",
    "reason" =>
      "Walk A/B Fort Oak is an adult partner dyad fixture with no Family context or youth member. Carter family fixtures own guardian/youth flows; seeding soccer practice onto Walk A/B would invent unlawful family graph state. SKIP."
  })

# 6) Shared agreed movie — Continuity shared memory (dual consent → active).
shared =
  case Continuity.propose_shared_memory(%{
         conversation_id: fort_oak,
         proposed_by_user_id: walk_a,
         summary: "We agreed to watch Interstellar together",
         purpose: "shared continuity",
         required_participant_ids: [walk_a, walk_b],
         idempotency_key: "pass2-shared-interstellar-agreed"
       }) do
    {:ok, mem, tag} -> {:ok, mem, tag}
    other -> {:error, other}
  end

report =
  case shared do
    {:ok, mem, tag} ->
      final =
        cond do
          mem.status == "active" ->
            mem

          mem.status == "pending_consent" ->
            _ =
              Continuity.respond_shared_memory(%{
                shared_memory_id: mem.id,
                user_id: walk_a,
                decision: "accept"
              })

            case Continuity.respond_shared_memory(%{
                   shared_memory_id: mem.id,
                   user_id: walk_b,
                   decision: "accept"
                 }) do
              {:ok, %{memory: active_mem}} -> active_mem
              _ ->
                case Continuity.get_shared_memory(mem.id, walk_a) do
                  {:ok, m} -> m
                  _ -> mem
                end
            end

          true ->
            case Continuity.get_shared_memory(mem.id, walk_a) do
              {:ok, m} -> m
              _ -> mem
            end
        end

      status_ok = final.status == "active"

      put_seed.(
        put_assert.(report, "B_SHARED_FACT_VISIBLE_TO_A_WHEN_AUTHORIZED", %{
          "shared_memory_id" => final.id,
          "status" => final.status,
          "propose_tag" => to_string(tag),
          "visible_to_a" => match?({:ok, _}, Continuity.get_shared_memory(final.id, walk_a)),
          "visible_to_b" => match?({:ok, _}, Continuity.get_shared_memory(final.id, walk_b)),
          "pass" => status_ok
        }),
        %{
          "fact" => "shared_agreed_movie_interstellar",
          "shared_memory_id" => final.id,
          "status" => final.status,
          "participant_ids" => final.participant_ids,
          "tag" => to_string(tag),
          "path" => "Continuity.propose_shared_memory+dual_accept"
        }
      )

    {:error, other} ->
      fail.(report, "shared_movie_seed_failed: #{inspect(other)}")
  end

# Cross-user private leak check: Walk B ring fact must not be readable by Walk A.
ring_mem_id =
  report["seeded"]
  |> Enum.find_value(fn
    %{"fact" => "partner_ring_size", "promoted_memory_id" => id} when is_binary(id) -> id
    _ -> nil
  end)

report =
  if is_binary(ring_mem_id) do
    a_denied = Continuity.get_private_memory(ring_mem_id, walk_a)
    b_ok = Continuity.get_private_memory(ring_mem_id, walk_b)
    a_view = MemoryIntelligence.candidates_for_context(walk_a)
    b_owns_in_a_view? = Enum.any?(a_view, &(&1["owner_user_id"] == walk_b))

    put_assert.(report, "USER_A_PRIVATE_FACT_NOT_VISIBLE_TO_B", %{
      "note" => "Walk B owns ring-size fact; Walk A must not read it (directional inverse of leak)",
      "walk_a_get_private" => inspect(a_denied),
      "walk_b_get_private_ok" => match?({:ok, _}, b_ok),
      "walk_b_owner_in_a_candidates" => b_owns_in_a_view?,
      "pass" => a_denied == {:error, :forbidden} and match?({:ok, _}, b_ok) and not b_owns_in_a_view?
    })
  else
    # Fallback: private Interstellar preference owned by A must not appear in B context.
    a_facts = FollowThrough.list_memories(walk_a)
    b_view = MemoryIntelligence.candidates_for_context(walk_b)
    leak? = Enum.any?(b_view, &(&1["owner_user_id"] == walk_a))

    put_assert.(report, "USER_A_PRIVATE_FACT_NOT_VISIBLE_TO_B", %{
      "walk_a_private_count" => length(a_facts),
      "walk_a_owner_in_b_candidates" => leak?,
      "pass" => not leak?
    })
  end

# Flip assertion naming to product law: A private not visible to B.
# Also prove B cannot list A's Interstellar durable row via owner-scoped APIs.
a_movie_ids =
  from(m in RelationshipMemory,
    where:
      m.owner_user_id == ^walk_a and m.deletion_state == "active" and
        ilike(m.summary, "%interstellar%"),
    select: m.id
  )
  |> Repo.all()

b_cannot_read_a_movie? =
  Enum.all?(a_movie_ids, fn id ->
    Continuity.get_private_memory(id, walk_b) == {:error, :forbidden}
  end)

priv_base = Map.get(report["assertions"], "USER_A_PRIVATE_FACT_NOT_VISIBLE_TO_B", %{})

priv_assert =
  Map.merge(priv_base, %{
    "a_interstellar_memory_ids" => a_movie_ids,
    "b_forbidden_on_a_movie" => b_cannot_read_a_movie?,
    "pass" => Map.get(priv_base, "pass", true) and b_cannot_read_a_movie?
  })

report = put_assert.(report, "USER_A_PRIVATE_FACT_NOT_VISIBLE_TO_B", priv_assert)

# Shared path already asserted; confirm A sync surfaces shared Interstellar.
{:ok, sync_a} = Continuity.sync_continuity(walk_a, fort_oak)

shared_visible? =
  Enum.any?(sync_a["shared_memories"] || [], fn m ->
    String.contains?(String.downcase(m["summary"] || ""), "interstellar") and
      m["status"] == "active"
  end)

shared_assert_base =
  Map.get(report["assertions"], "B_SHARED_FACT_VISIBLE_TO_A_WHEN_AUTHORIZED", %{})

shared_assert =
  Map.merge(shared_assert_base, %{
    "sync_a_shared_interstellar" => shared_visible?,
    "pass" => Map.get(shared_assert_base, "pass", false) and shared_visible?
  })

report = put_assert.(report, "B_SHARED_FACT_VISIBLE_TO_A_WHEN_AUTHORIZED", shared_assert)

# Aggregate ok from assertion passes.
assert_pass? =
  report["assertions"]
  |> Map.values()
  |> Enum.all?(fn
    %{"pass" => p} -> p == true
    _ -> true
  end)

report =
  report
  |> Map.put("seeded", Enum.reverse(report["seeded"]))
  |> Map.put("skipped", Enum.reverse(report["skipped"]))
  |> Map.put("ok", report["ok"] == true and assert_pass?)
  |> Map.put("finished_at", DateTime.utc_now() |> DateTime.to_iso8601())

json = Jason.encode!(report, pretty: true)
out_path =
  Path.expand("../../../docs/evidence/v2-coded-experience/a8-three-pass/PASS2_RELATIONSHIP_FIXTURES_SEED.json", __DIR__)

File.mkdir_p!(Path.dirname(out_path))
File.write!(out_path, json)

IO.puts("PASS2_RELATIONSHIP_FIXTURES_JSON_BEGIN")
IO.puts(json)
IO.puts("PASS2_RELATIONSHIP_FIXTURES_JSON_END")
IO.puts("WROTE #{out_path}")

unless report["ok"] do
  System.halt(1)
end
