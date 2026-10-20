defmodule OpalCore.SocialFlow.OrbitSamenessTest do
  @moduledoc """
  Repair #20 amendment wave - THE SAMENESS TEST (Orbit Law 2,
  founder, 2026-10-20 08:15 PDT): "If multiple people were having
  the same conversation with the same person and they opened Orbit,
  and all their answers from Opal's Orbit are the same, then Orbit
  didn't work."

  Every asker's help must differ because every asker converses with
  that person differently. Orbit's answers assemble from the ASKER'S
  OWN scoped context - their capsules about this person, their
  dyadic history with this person, their relationship type/tone,
  their Soul - never a shared template, never the partner's context.

  This file joins the two-account isolation proofs (the W-GAP-32
  suite in repair18_sm_isolation_test.exs) as a standing regression
  species: two askers, one shared partner, two different dyadic
  worlds. The assembly under test is the real one the Opal
  conversation uses: `PromptBuilder.build/4` with a scoped account
  (`SocialMemory.for_account/1`), fed by the one scoped assembly
  (`ScopedContext` -> `CapsuleRead`) in its capsule section, and by
  `SocialMemory` recall (person memories, conversation index) for
  relationship and history.

  Pins:
  (a) SUBSTANCE DIFFERS - A's package carries A's capsule content,
      A's history summary, A's relationship facet (type + tone);
      B's carries B's; the assembled prompt texts differ beyond ids.
  (b) ISOLATION - no string sourced from B's capsules or B's private
      history appears in A's package, and vice versa (literal
      substring scans over the package text, W-GAP-32 style).
  (c) THE PARTNER'S OWN PRIVATE CAPSULES appear in NEITHER asker's
      package - the partner's context is never the source.

  Standing law recorded alongside: no rote/template relational
  answers - answers assemble from the asker's own scoped context.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.PromptBuilder
  alias OpalCore.MemoryWallet.{CapsuleRead, ScopedContext}
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{ConversationIndex, PersonMemory}

  # Distinctive content markers, one family per holder. Any of these
  # strings appearing in the wrong package is a leak, by construction.
  @a_markers ~w(ZX-A1 ZX-A2 ZX-A3 ZX-A4 ZX-A5)
  @b_markers ~w(ZX-B1 ZX-B2 ZX-B3 ZX-B4 ZX-B5)
  @p_markers ~w(ZX-P1 ZX-P2 ZX-P3)

  defp fresh_user(name) do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{id: Ecto.UUID.generate(), handle: "orb-#{suffix}", display_name: name})
    |> Repo.insert!()
  end

  defp conversation_with(members, label) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: label})
      |> Repo.insert!()

    for uid <- members do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv
  end

  defp say!(conv, sender, seq, body) do
    %Message{}
    |> Message.create_changeset(%{
      id: Ecto.UUID.generate(),
      conversation_id: conv.id,
      sender_user_id: sender.id,
      client_message_id: "orb-#{conv.id}-#{seq}",
      message_type: "text",
      body: body,
      server_seq: seq
    })
    |> Repo.insert!()
  end

  defp person_memory!(account_id, person_id, type, fact, note) do
    %PersonMemory{}
    |> PersonMemory.changeset(%{
      account_id: account_id,
      person_id: person_id,
      relationship_type: type,
      cadence_status: "stable",
      known_facts: %{"orbit_note" => %{"value" => fact, "provenance" => "stated"}},
      behavior_override: %{"note" => note}
    })
    |> Repo.insert!()

    # The relationship machinery is the stored-type authority; it
    # also syncs the type onto the person-memory row read by recall.
    assert {:ok, _} = Relationships.set_type(account_id, person_id, type)
  end

  defp index!(account_id, conv, summary) do
    %ConversationIndex{}
    |> ConversationIndex.changeset(%{
      account_id: account_id,
      conversation_id: conv.id,
      rolling_summary: summary,
      key_entities: %{"people" => [], "places" => [], "times" => [], "activities" => []},
      message_count: 2,
      last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
    })
    |> Repo.insert!()
  end

  defp build_world do
    a = fresh_user("Ana Asker")
    b = fresh_user("Ben Asker")
    p = fresh_user("Pat Partner")

    conv_a = conversation_with([a.id, p.id], "orbit-sameness-a")
    conv_b = conversation_with([b.id, p.id], "orbit-sameness-b")

    # Different message history in each dyad (the raw history the
    # distilled memory below was learned from).
    say!(conv_a, a, 1, "Pat, sunrise hike Saturday? ZX-A0")
    say!(conv_a, p, 2, "Only if we stop at the gallery after.")
    say!(conv_b, b, 1, "Pat, can we settle the invoice Friday? ZX-B0")
    say!(conv_b, p, 2, "Send the budget sheet and I will sign.")

    assert {:ok, [_m1, _m2]} = OpalCore.Messages.list_messages(conv_a.id, a.id)
    assert {:ok, [_m3, _m4]} = OpalCore.Messages.list_messages(conv_b.id, b.id)

    # Different dyadic memory: A's Pat is a close friend known for
    # sunrise hikes; B's Pat is a business contact known for budgets.
    person_memory!(
      a.id,
      p.id,
      "close_friend",
      "Pat hikes at sunrise with A ZX-A1",
      "A asks Pat directly and early ZX-A2"
    )

    person_memory!(
      b.id,
      p.id,
      "business",
      "Pat reviews budgets with B ZX-B1",
      "B gives Pat space and checks in late ZX-B2"
    )

    index!(a.id, conv_a, "A and Pat talked about sunrise hikes and the gallery show ZX-A3")
    index!(b.id, conv_b, "B and Pat talked about quarterly budgets and invoices ZX-B3")

    # Capsules through the real write leg (CapsuleRead.remember/2 -
    # the capsule write facade): conversation-scoped AND
    # relationship-scoped, a different set per asker.
    assert {:ok, cap_a_conv} =
             CapsuleRead.remember(a.id, %{
               "summary" => "A capsule: Pat promised A the studio keys ZX-A4",
               "scope_kind" => "conversation",
               "scope_id" => conv_a.id
             })

    assert {:ok, cap_a_rel} =
             CapsuleRead.remember(a.id, %{
               "summary" => "A relationship capsule: Pat tells A family news first ZX-A5",
               "scope_kind" => "relationship",
               "scope_id" => p.id,
               "counterpart_user_id" => p.id
             })

    assert {:ok, cap_b_conv} =
             CapsuleRead.remember(b.id, %{
               "summary" => "B capsule: Pat owes B a signed budget sheet ZX-B4",
               "scope_kind" => "conversation",
               "scope_id" => conv_b.id
             })

    assert {:ok, cap_b_rel} =
             CapsuleRead.remember(b.id, %{
               "summary" => "B relationship capsule: Pat prefers B email, never calls ZX-B5",
               "scope_kind" => "relationship",
               "scope_id" => p.id,
               "counterpart_user_id" => p.id
             })

    # The partner's OWN private capsules: a user-scoped journal note,
    # one scoped to the A thread, one relationship-scoped to A. None
    # of these is A's or B's to read, in any assembly.
    assert {:ok, _} =
             CapsuleRead.remember(p.id, %{"summary" => "P private journal entry ZX-P1"})

    assert {:ok, _} =
             CapsuleRead.remember(p.id, %{
               "summary" => "P capsule inside the A thread ZX-P2",
               "scope_kind" => "conversation",
               "scope_id" => conv_a.id
             })

    assert {:ok, _} =
             CapsuleRead.remember(p.id, %{
               "summary" => "P relationship capsule about A ZX-P3",
               "scope_kind" => "relationship",
               "scope_id" => a.id,
               "counterpart_user_id" => a.id
             })

    %{
      a: a,
      b: b,
      p: p,
      conv_a: conv_a,
      conv_b: conv_b,
      cap_a_ids: [cap_a_conv.id, cap_a_rel.id],
      cap_b_ids: [cap_b_conv.id, cap_b_rel.id]
    }
  end

  defp prompt_for(account_id, conversation_id) do
    built =
      PromptBuilder.build(
        SocialMemory.for_account(account_id),
        conversation_id,
        "what should I say to Pat about this weekend?",
        []
      )

    built.what_you_know || built.system_extra || ""
  end

  test "two askers, one partner: the assembled packages differ in substance and leak nothing" do
    w = build_world()

    text_a = prompt_for(w.a.id, w.conv_a.id)
    text_b = prompt_for(w.b.id, w.conv_b.id)

    # (a) The packages DIFFER in substance, not just in ids.
    assert text_a != text_b

    for marker <- @a_markers do
      assert String.contains?(text_a, marker), "A's package is missing A's own #{marker}"
    end

    for marker <- @b_markers do
      assert String.contains?(text_b, marker), "B's package is missing B's own #{marker}"
    end

    # The relationship facet itself differs: A's Pat is a close
    # friend in the warm_casual tone; B's Pat is a business contact
    # in the friendly_respectful tone (the seeded profile tones).
    assert String.contains?(text_a, "close_friend")
    assert String.contains?(text_a, "warm_casual")
    assert String.contains?(text_b, "business")
    assert String.contains?(text_b, "friendly_respectful")
    refute String.contains?(text_a, "friendly_respectful")
    refute String.contains?(text_b, "warm_casual")

    # Recall carries the asker's own relationship record, too.
    recall_a = SocialMemory.recall_for_conversation(SocialMemory.for_account(w.a.id), w.conv_a.id)
    recall_b = SocialMemory.recall_for_conversation(SocialMemory.for_account(w.b.id), w.conv_b.id)
    assert [%{relationship_type: "close_friend", person_id: person_a}] = recall_a.people
    assert [%{relationship_type: "business", person_id: person_b}] = recall_b.people
    assert person_a == w.p.id
    assert person_b == w.p.id

    # (b) ISOLATION: no B-sourced string in A's package, no
    # A-sourced string in B's package - literal substring scans.
    for marker <- @b_markers do
      refute String.contains?(text_a, marker), "B's #{marker} leaked into A's package"
    end

    for marker <- @a_markers do
      refute String.contains?(text_b, marker), "A's #{marker} leaked into B's package"
    end

    # (c) The partner's own private capsules appear in NEITHER
    # package - the partner is never the context source.
    for marker <- @p_markers do
      refute String.contains?(text_a, marker), "P's #{marker} leaked into A's package"
      refute String.contains?(text_b, marker), "P's #{marker} leaked into B's package"
    end

    # Positive control for (c): P's own assembly DOES carry P's
    # user-scoped capsule, so its absence above is scoping, not a
    # broken store.
    p_package = ScopedContext.assemble(w.p.id)
    assert String.contains?(p_package.text || "", "ZX-P1")
  end

  test "scoped-context packages: capsule ids and counts are the asker's alone" do
    w = build_world()

    pkg_a = ScopedContext.assemble(w.a.id, scope_kind: "conversation", scope_id: w.conv_a.id)
    pkg_b = ScopedContext.assemble(w.b.id, scope_kind: "conversation", scope_id: w.conv_b.id)

    a_ids = Enum.map(pkg_a.capsules, & &1["id"])
    b_ids = Enum.map(pkg_b.capsules, & &1["id"])

    # The conversation-scoped capsule is in its owner's package
    # through the assemble/2 entry itself.
    assert hd(w.cap_a_ids) in a_ids
    assert hd(w.cap_b_ids) in b_ids

    # Zero cross-asker material, at the id level and the count level.
    for id <- w.cap_b_ids, do: refute(id in a_ids)
    for id <- w.cap_a_ids, do: refute(id in b_ids)
    assert pkg_a.capsule_count == length(a_ids)
    assert pkg_b.capsule_count == length(b_ids)
    assert pkg_a.account_id == w.a.id
    assert pkg_b.account_id == w.b.id

    for marker <- @b_markers do
      refute String.contains?(pkg_a.text || "", marker)
    end

    for marker <- @a_markers do
      refute String.contains?(pkg_b.text || "", marker)
    end
  end
end
