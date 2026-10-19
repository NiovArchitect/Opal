defmodule OpalCore.Repair18PatternEnforcementTest do
  @moduledoc """
  Repair #18 — Mistake-Pattern Catalog ENFORCEMENT TEETH (backend).

  Catalog: shots/repair18/MISTAKE_PATTERN_CATALOG.md §4.1 — pattern rules
  are machine-enforced, not remembered. A fingerprint hit fails the build
  at the same level as any other test failure. Shape follows the R13
  gyroscope gate (plan_projection_coherence_test.exs): scan lib/**/*.ex,
  compare against a named registry, exact set in both directions.

  Covered here:
   - MP-6: direct queries against the personal-memory table
     (`personal_relationship_memories`, schema RelationshipMemory)
     outside the memory facade / declared owner. Grep-level: `from(... in
     RelationshipMemory`, `Repo.get/get_by/get_by!(RelationshipMemory`,
     and `%RelationshipMemory{}` construction. NOT covered (named gap):
     indirect queries through a variable (`Repo.all(q)` where `q` was
     built elsewhere) and raw SQL — neither is grep-decidable; the
     two-account isolation proofs remain the behavioral guard there.
   - MP-1: no controller or channel may reach the founder seed modules
     (the canned/seed answering path) — the ONLY web-layer caller is the
     gated FounderSeedController. No scripted-responder module may be
     defined anywhere in lib/.
   - MP-2 / seed provenance (catalog §4.2): the seed provenance values
     written into PlanParticipant.authority_source and the stable seed
     peer UUIDs may appear ONLY in the two seed modules; both seed
     modules must keep their `allowed?/0` gate on
     `:allow_founder_communication_seed`. NOT covered (named gap):
     SharedPlan, Message, and User rows carry NO provenance field (no
     migration in this program), so "production projections exclude
     seed plans/messages/users" is not yet provable from the rows
     themselves — provenance exists only at participant level and via
     message client_message_id prefixes. See the teeth report.
   - MP-4 (partial): the deleted canned-transcript signature
     (`stub_transcript`) may never re-enter lib/. The general
     "provider returns {:ok, ...} unkeyed" shape is not grep-decidable
     without false positives; it stays with the BS honesty suite.

  TEETH-2 (2026-10-18, muse/r18-teeth2) — repairs per the red-team
  report (coordination/repair18/redteam-report.md, FIX-1..FIX-12).
  Bounds are stated where a class cannot be machine-closed; each bound
  is mirrored as a LABELED hope/gap in the catalog §5 ledger:
   - FIX-2: bare-schema sources (`from(RelationshipMemory)`) and
     wholesale Repo calls (`Repo.all/one/one!/aggregate/exists?` on the
     schema) are query patterns (red-team B1). RESIDUAL, labeled
     MP-6c: a query built from a VARIABLE holding the schema
     (`schema = RelationshipMemory; Repo.all(schema)`) is
     grep-invisible; the behavioral isolation proofs remain the guard.
   - FIX-8/FIX-9: MP-6 baselines are per-SITE counts per file, and the
     facade/owner files are counted like everyone else — there is no
     path blanket exemption anymore (red-team B2/B3). A new query site
     inside a baselined or trusted file changes its count and fails.
   - FIX-6: seed-module reach is scanned across ALL of lib/, not just
     the web layer (red-team B4). The allowed set is exact: the two
     seed modules, the gated FounderSeedController, and
     plan_transition.ex (documentation-only reference to the
     seed_restore transition, verified at teeth-2: it names the seed
     module in its moduledoc table and defines no call to it).
   - FIX-5 (PARTIAL, bound stated): scripted-responder module-name
     families are extended, and a responder SHAPE is banned: a module
     holding a string map with >=2 sentence-like values AND defining a
     reply/respond/answer function AND making no Repo/Req/HTTP call is
     a canned responder, whatever it is named. BOUND: a renamed
     responder without that shape remains a LABELED HOPE (§5).
   - FIX-10: (a) the seed provenance fragments `communication_seed` /
     `graph_commitment_seed` may not appear in any string context
     outside the seed modules — the lawful config-atom files keep an
     atom-only allowance (the `:allow_founder_*` atoms and the seed
     modules' own file names are stripped before the check), so string
     concatenation/interpolation can no longer mint the value
     (red-team B6). BOUND: a value assembled from fragments that never
     contain a contiguous fragment (e.g. "communication" <> "_seed")
     remains a LABELED HOPE. (b) PlanParticipant/SharedPlan changeset
     WRITERS are an exact registry: a module constructing plan or
     participant changesets outside the registry fails — synthetic
     writers must register here visibly and inherit the seed gate.
  """

  use ExUnit.Case, async: true

  @lib_files Path.wildcard("lib/**/*.ex")

  defp source(file), do: File.read!(file)

  defp count_matches(pattern, src), do: length(Regex.scan(pattern, src))

  # ------------------------------------------------------------- MP-6 ---

  @memory_query_patterns [
    ~r/from\s*\([^)]*\bin\s+RelationshipMemory\b/,
    ~r/Repo\.(?:get|get_by|get_by!)\(\s*RelationshipMemory\b/,
    ~r/%RelationshipMemory\{\}/,
    # FIX-2 (red-team B1): bare-schema source and wholesale Repo calls.
    ~r/from\s*\(\s*RelationshipMemory\b/,
    ~r/Repo\.(?:all|one|one!|aggregate|exists\?)\(\s*RelationshipMemory\b/
  ]

  # MP-6 SITE-COUNT BASELINE (FIX-8/FIX-9): file -> number of query
  # pattern matches. Exact in both directions, shrink-only; every entry
  # is a migration item (MP-6 -> SP-6: route through a scoped facade
  # read). The facade (lib/opal_core/memory.ex) and the declared owner
  # (durable_preference_memory.ex) are counted here like everyone else
  # — no file is exempt by path anymore, so widening the SP-6 door
  # from inside a trusted file fails this test (red-team B3). Prune in
  # the same commit that migrates a site — a founder-visible event per
  # catalog §4.4.
  @memory_site_baseline %{
    "lib/opal_core/memory.ex" => 4,
    "lib/opal_core/social_flow/continuity.ex" => 1,
    # 10 -> 11 (adoption wave 2, spec 4.C6): erase_all_for_owner/1 -
    # ONE new owner-scoped DELETE site in the declared owner module,
    # added so AccountDeletion never reads the table directly.
    # Founder-visible per catalog 4.4; see adopt2-report.md item 4.
    # 11 -> 12 (Repair #18 SM scoped build): erase_one_for_owner/2 -
    # ONE new owner+id-scoped DELETE site in the declared owner
    # module, the per-capsule FORGET leg for the capsule facade
    # (CapsuleRead.forget/2). Founder-visible per catalog 4.4;
    # see sm-report.md.
    "lib/opal_core/social_flow/durable_preference_memory.ex" => 12,
    "lib/opal_core/social_flow/follow_through.ex" => 7,
    "lib/opal_core/social_flow/memory_intelligence.ex" => 2
  }

  defp memory_site_counts do
    for file <- @lib_files,
        file != "lib/opal_core/social_flow/relationship_memory.ex",
        count =
          Enum.sum(Enum.map(@memory_query_patterns, &count_matches(&1, source(file)))),
        count > 0,
        into: %{} do
      {file, count}
    end
  end

  defp memory_direct_readers, do: Map.keys(memory_site_counts())

  describe "MP-6: personal-memory table reads stay behind the facade/owner + named baseline" do
    test "the scan target is real" do
      assert @lib_files != []
      assert "lib/opal_core/social_flow/relationship_memory.ex" in @lib_files
    end

    test "the schema module itself runs no queries (it is a schema, not a reader)" do
      refute source("lib/opal_core/social_flow/relationship_memory.ex") =~ "Repo."
    end

    test "direct-reader SITE COUNTS are EXACTLY the baseline — growth inside any file fails (FIX-8/9)" do
      found = memory_site_counts()

      assert found == @memory_site_baseline, """
      MP-6 direct personal-memory reader site counts changed.

      Found:    #{inspect(found, pretty: true)}
      Expected: #{inspect(@memory_site_baseline, pretty: true)}

      A NEW reader, or a NEW query site inside an already-baselined or
      trusted file, is an unscoped wallet read (MP-6 -> SP-6): route it
      through OpalCore.Memory / DurablePreferenceMemory with scope and
      purpose in the predicate. A REMOVED site means the migration
      advanced — prune its count in @memory_site_baseline in this file
      in the same commit.
      """
    end

    test "to_contract-only references are not readers (scope of the fingerprint)" do
      # conversation_channel.ex renders RelationshipMemory.to_contract/1 on
      # rows the service already fetched — presentation, not a query.
      refute "lib/opal_core_web/channels/conversation_channel.ex" in memory_direct_readers()
    end
  end

  # ------------------------------------------------------------- MP-1 ---

  @seed_modules ["FounderCommunicationSeed", "FounderGraphCommitmentSeed"]

  # FIX-6: files in lib/ allowed to reference the seed modules at all.
  # Exact set: the two seed modules themselves, the gated controller,
  # and plan_transition.ex (documentation-only; see moduledoc).
  @seed_reach_allowed [
    "lib/opal_core/social_flow/founder_communication_seed.ex",
    "lib/opal_core/social_flow/founder_graph_commitment_seed.ex",
    "lib/opal_core/social_flow/plan_transition.ex",
    "lib/opal_core_web/controllers/founder_seed_controller.ex"
  ]

  describe "MP-1: no scripted/seed answering path is reachable from controllers or channels" do
    test "only the gated FounderSeedController references the seed modules in the web layer" do
      web_layer = Path.wildcard("lib/opal_core_web/**/*.ex")

      offenders =
        for file <- web_layer,
            src = source(file),
            Enum.any?(@seed_modules, &String.contains?(src, &1)),
            file != "lib/opal_core_web/controllers/founder_seed_controller.ex" do
          file
        end

      assert offenders == [],
             "MP-1: seed modules reached from #{inspect(offenders)} — seed is data, never behavior (SP-1)"
    end

    test "seed-module reach across ALL of lib/ is exactly the allowed set (FIX-6: bridges are violations)" do
      found =
        for file <- @lib_files,
            src = source(file),
            Enum.any?(@seed_modules, &String.contains?(src, &1)),
            do: file

      assert Enum.sort(found) == Enum.sort(@seed_reach_allowed), """
      MP-1/FIX-6: seed-module references in lib/ changed.
      Found:    #{inspect(Enum.sort(found))}
      Expected: #{inspect(Enum.sort(@seed_reach_allowed))}
      A new file referencing a seed module — in ANY layer, including a
      core-layer bridge — makes the seed answering path reachable
      (MP-1). The gated FounderSeedController is the only caller.
      """
    end

    test "no scripted-responder module is defined anywhere in lib/" do
      banned =
        ~r/defmodule\s+\S*(SeedResponder|ScriptedResponder|CannedRepl|SeedThread|LocalReply|ReplyEngine|ScriptedReply|OfflineResponder)/

      offenders =
        for file <- @lib_files, Regex.match?(banned, source(file)), do: file

      assert offenders == [],
             "MP-1: scripted responder module defined in #{inspect(offenders)}"
    end

    test "no service-free module holds a canned-reply shape (FIX-5, PARTIAL)" do
      # Shape: >=2 sentence-like values in string-keyed map entries,
      # a reply/respond/answer function, and no Repo/Req/HTTP call —
      # the module answers from its own table, by construction.
      offenders =
        for file <- @lib_files,
            src = source(file),
            sentence_entries =
              Regex.scan(~r/"[a-z][a-z0-9_]{0,20}"\s*=>\s*"([^"\n]+)"/, src)
              |> Enum.count(fn [_, v] -> length(String.split(v)) >= 4 end),
            sentence_entries >= 2,
            Regex.match?(~r/def\s+(reply|respond|answer)\b/, src),
            not Regex.match?(~r/\bRepo\.|Req\.|Finch\.|:httpc/, src) do
          file
        end

      assert offenders == [],
             "MP-1/FIX-5: canned-reply shape (sentence table + reply function + no service call) in #{inspect(offenders)} — answers are composed by the real service (SP-1)"
    end
  end

  # ------------------------------------------- MP-2 / seed provenance ---

  # The provenance VALUE as written into a record — not the bare string:
  # `:allow_founder_communication_seed` (the config gate atom) and the
  # seed modules' own file paths (PlanProjection registry) legitimately
  # contain the substring elsewhere. The fingerprint is the assignment.
  @seed_provenance_writes [
    ~r/authority_source:\s*"founder_(?:communication|graph_commitment)_seed"/,
    ~r/"authority_source"\s*=>\s*"founder_(?:communication|graph_commitment)_seed"/
  ]
  @seed_peer_uuid_prefix "f0c4a4e1-1111"
  @seed_module_files [
    "lib/opal_core/social_flow/founder_communication_seed.ex",
    "lib/opal_core/social_flow/founder_graph_commitment_seed.ex"
  ]

  describe "MP-2/§4.2: seed provenance is written only by the seed modules, behind their gate" do
    test "seed provenance authority_source values appear only in the seed modules" do
      offenders =
        for file <- @lib_files,
            src = source(file),
            Enum.any?(@seed_provenance_writes, &Regex.match?(&1, src)),
            file not in @seed_module_files do
          file
        end

      assert offenders == [],
             "seed provenance forged/spread by #{inspect(offenders)} — provenance must stay seed-module-only"
    end

    test "provenance fragments cannot be minted by concatenation outside the seed modules (FIX-10a)" do
      # Strip the lawful atom contexts and the seed modules' own file
      # names; any remaining contiguous fragment is a string-context
      # use — a literal, a concatenation operand, or an interpolation.
      strip_lawful = fn src ->
        src
        |> String.replace(":allow_founder_communication_seed", "")
        |> String.replace(":allow_founder_graph_commitment_seed", "")
        |> String.replace("founder_communication_seed", "")
        |> String.replace("founder_graph_commitment_seed", "")
      end

      offenders =
        for file <- @lib_files,
            file not in @seed_module_files,
            stripped = strip_lawful.(source(file)),
            String.contains?(stripped, "communication_seed") or
              String.contains?(stripped, "graph_commitment_seed") do
          file
        end

      assert offenders == [],
             "MP-2/FIX-10a: seed provenance fragment minted outside the seed modules by #{inspect(offenders)} — concatenation/interpolation cannot forge provenance (SP-2)"
    end

    test "stable seed peer UUIDs appear only in the seed modules (lib + priv seeds)" do
      files = @lib_files ++ ["priv/repo/seeds.exs"]

      # Repair #19 (W1): the human seed world (registered above for
      # FIX-10b) carries two NEW stable peer ids in the same family
      # (Priya Shah / Marcus Lee). It is seed-gated by inheritance —
      # callable only from the graph commitment seed's gated ensure!/2 —
      # so it is a lawful holder of seed peer ids, named here visibly.
      uuid_holders = @seed_module_files ++ ["lib/opal_core/social_flow/human_seed_world.ex"]

      offenders =
        for file <- files,
            File.exists?(file),
            String.contains?(source(file), @seed_peer_uuid_prefix),
            file not in uuid_holders do
          file
        end

      assert offenders == [],
             "seed peer identities leaked into #{inspect(offenders)}"
    end

    test "both seed modules keep the allowed?/0 founder-seed gate" do
      for file <- @seed_module_files do
        src = source(file)
        assert src =~ "def allowed?"
        assert src =~ "allow_founder_communication_seed"
        assert src =~ "unless allowed?()"
      end
    end

    test "the founder seed controller requires explicit opt-in" do
      src = source("lib/opal_core_web/controllers/founder_seed_controller.ex")
      assert src =~ "explicit_opt_in"
      assert src =~ "founder_seed_disabled"
    end

    test "plan/participant changeset writers are EXACTLY the registry (FIX-10b)" do
      # A module that constructs PlanParticipant/SharedPlan changesets
      # writes real plan rows. Outside this registry it fails, so a
      # synthetic writer must register here visibly (founder-visible,
      # §4.4) and inherit the provenance gate above.
      registry = [
        "lib/opal_core/center/action_orchestrator.ex",
        "lib/opal_core/center/provider_action.ex",
        # Repair #18 adoption wave 1: graph_people.ex writes exactly
        # one plan-row stamp - the shelf spark's promotion provenance
        # (promoted_to_plan_id/promoted_at in the spark's alignment),
        # after creating the promoted plan through the existing
        # graph-create door in SocialFlow. Registered visibly per
        # FIX-10b.
        "lib/opal_core/graph_people.ex",
        "lib/opal_core/social_flow.ex",
        "lib/opal_core/social_flow/collective.ex",
        "lib/opal_core/social_flow/conversation_alignment.ex",
        "lib/opal_core/social_flow/discovery.ex",
        "lib/opal_core/social_flow/founder_communication_seed.ex",
        "lib/opal_core/social_flow/founder_graph_commitment_seed.ex",
        # Repair #19 (W1): the human seed world writes plan/participant
        # rows for the founder review world. Registered visibly per
        # FIX-10b in the commit that introduced it; it is callable ONLY
        # from the graph commitment seed's gated ensure!/2 (it defines
        # no gate of its own and has no other caller), so the MP-2 cage
        # is inherited, not widened.
        "lib/opal_core/social_flow/human_seed_world.ex",
        "lib/opal_core/social_flow/households.ex",
        "lib/opal_core/social_flow/journey_authority.ex",
        "lib/opal_core/social_flow/live_experience.ex",
        "lib/opal_core/social_flow/plan_completion.ex",
        "lib/opal_core/trips.ex"
      ]

      found =
        for file <- @lib_files,
            Regex.match?(
              ~r/(?:PlanParticipant|SharedPlan)\.changeset\(/,
              source(file)
            ),
            do: file

      assert Enum.sort(found) == Enum.sort(registry), """
      MP-2/FIX-10b: plan/participant changeset writers changed.
      Found:    #{inspect(Enum.sort(found))}
      Expected: #{inspect(Enum.sort(registry))}
      A new writer of plan rows must be registered in this test in the
      same commit — registration is the visible event (§4.4).
      """
    end
  end

  # ------------------------------------------------------------- MP-4 ---

  describe "MP-4 (partial): the deleted canned-transcript signature stays deleted" do
    test "no lib/ file returns or references a stub transcript" do
      offenders =
        for file <- @lib_files, String.contains?(source(file), "stub_transcript") do
          file
        end

      assert offenders == [], "MP-4: stub_transcript re-entered #{inspect(offenders)}"
    end
  end
end
