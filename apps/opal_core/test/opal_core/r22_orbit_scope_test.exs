defmodule OpalCore.R22OrbitScopeTest do
  @moduledoc """
  Repair #22 (WS-10) — THE WRONG-BRAINED OPENER, pinned.

  The defect: inside Maya's orbit, the "Shape what to say"
  suggestion rendered "You mentioned Maya earlier — want to keep
  going on that, or something new?" — the orbit's own anchor spoken
  about in the third person, as if she were elsewhere. Mechanism:
  the generation pipeline received only (user_id, text); context
  assembly built a GLOBAL packet (global frequent contacts, history
  re-derived from whichever session was active, no anchor, no
  thread), and render_chat's sticky re-engagement revived the
  first frequent-contact name found in history. The session's own
  scope — anchor_type/anchor_id/context_person_id/
  context_conversation_id, stored on the session row since Repair
  #19 — was dropped at the create_user_message seam.

  The fix pinned here, at the generation layer:
  1. OpalContext.assemble/4 takes the target session and puts an
     :orbit_scope slice in the packet (anchor, scoped person/plan,
     the anchored human thread's actual messages), and reads the
     conversation history from THAT session.
  2. OpalResponse, inside a scoped orbit: a shaping/draft ask is
     answered with a draft derived from the scoped thread's own
     content, and the sticky re-engagement's candidate set excludes
     the orbit's anchor person — the anchor can never be revived
     in the third person inside their own room.

  Run: mix test test/opal_core/r22_orbit_scope_test.exs
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Messages
  alias OpalCore.OpalContext
  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.OpalResponse
  alias OpalCore.Repo

  @shape_ask "Help me shape what to say in this conversation. Draft one reply I could send, in my own voice, based on where this conversation is at. Give me just the draft reply."
  @maya_ask "Sorry I missed you earlier — can we talk tonight about Saturday?"

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp maya, do: Fixtures.user_maya_id()

  # --- Unit level: the generation law, with the trap fully armed ---------

  defp scoped_ctx(raw, history) do
    %{
      user: %{id: "u1", display_name: "Alex"},
      social: %{
        frequent_contacts: [%{user_id: "c-maya", display_name: "Maya Torres"}]
      },
      conversation_history: history,
      message: %{text: raw},
      orbit_scope: %{
        session_id: "s1",
        anchor: %{type: "person", id: "c-maya", label: "Maya Torres"},
        person: %{id: "c-maya", display_name: "Maya Torres"},
        plan: nil,
        thread: %{
          conversation_id: "conv-maya",
          messages: [
            %{role: "peer", speaker: "Maya Torres", body: @maya_ask}
          ]
        }
      }
    }
  end

  defp chat!(raw, ctx) do
    intent = %{intent: :chat, confidence: :high, entities: %{}, raw_text: raw}
    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    text
  end

  test "WS-10 pin: a shaping ask inside Maya's orbit drafts from Maya's thread, never third-persons her" do
    ctx =
      scoped_ctx(@shape_ask, [
        %{role: "user", body: "Help me plan something good with Maya for Saturday."}
      ])

    text = chat!(@shape_ask, ctx)

    # The draft answers the anchor thread's actual last ask — its
    # own words (tonight, Saturday) transformed from ask to assent.
    assert text == "Yes — let's talk tonight about Saturday."
    # And the scope law: the anchor is spoken TO, never spoken about.
    refute text =~ "You mentioned Maya"
    refute text =~ "Maya earlier"
  end

  test "WS-10 pin: an idle turn inside the anchor's orbit never revives the anchor in the third person" do
    ctx =
      scoped_ctx("just thinking", [
        %{role: "user", body: "I was thinking about Maya"},
        %{role: "opal", body: "Tell me more"}
      ])

    text = chat!("just thinking", ctx)
    refute text =~ "You mentioned Maya"
    refute text =~ "You mentioned"
  end

  test "WS-10: the same idle turn UNSCOPED keeps the sticky nudge (the law is scope, not a copy swap)" do
    ctx = %{
      user: %{id: "u1", display_name: "Alex"},
      social: %{
        frequent_contacts: [%{user_id: "c-maya", display_name: "Maya Torres"}]
      },
      conversation_history: [
        %{role: "user", body: "I was thinking about Maya"},
        %{role: "opal", body: "Tell me more"}
      ],
      message: %{text: "just thinking"}
    }

    text = chat!("just thinking", ctx)
    assert text =~ "You mentioned Maya earlier"
  end

  test "WS-10: a shaping ask with a scoped plan but no thread question drafts from the plan" do
    ctx =
      scoped_ctx(@shape_ask, [])
      |> put_in([:orbit_scope, :thread], %{conversation_id: "c", messages: []})
      |> put_in([:orbit_scope, :plan], %{
        id: "p1",
        title: "Talk tonight about Saturday",
        time_label: nil
      })

    text = chat!(@shape_ask, ctx)
    assert text == "Let's talk tonight about Saturday."
    refute text =~ "You mentioned"
  end

  # --- Integration level: assembly carries the session's scope -----------

  defp maya_thread! do
    {:ok, %{conversation_id: cid}} = Messages.ensure_direct_conversation(alex(), maya())

    assert {:ok, _msg, _} =
             Messages.accept_message(%{
               conversation_id: cid,
               sender_user_id: maya(),
               client_message_id: "r22-maya-ask-#{System.unique_integer([:positive])}",
               message_type: "text",
               body: @maya_ask
             })

    cid
  end

  defp scoped_session!(cid) do
    assert {:ok, %{conversation: session}} =
             OpalConversations.create_scoped_session(alex(), %{
               "person_id" => maya(),
               "conversation_id" => cid
             })

    # The seed world's own trap-arming: a prior user turn in this
    # room that names the anchor (the user's own words about Maya,
    # exactly as HumanSeedWorld seeds "Saturday with Maya").
    %OpalMessage{}
    |> OpalMessage.changeset(%{
      "conversation_id" => session.id,
      "role" => "user",
      "body" => "Help me plan something good with Maya for Saturday."
    })
    |> Repo.insert!()

    session
  end

  test "WS-10 integration: assemble/4 puts the orbit scope + this session's history in the packet" do
    cid = maya_thread!()
    session = scoped_session!(cid)

    assert {:ok, ctx} = OpalContext.assemble(alex(), @shape_ask, nil, session: session)

    scope = ctx.orbit_scope
    assert scope.person.id == maya()
    assert scope.anchor.type == "person"
    assert scope.anchor.id == maya()
    assert scope.thread.conversation_id == cid

    bodies = Enum.map(scope.thread.messages, & &1.body)
    assert @maya_ask in bodies

    peer = Enum.find(scope.thread.messages, &(&1.body == @maya_ask))
    assert peer.role == "peer"
    assert peer.speaker == "Maya"

    history_bodies = Enum.map(ctx.conversation_history, & &1.body)
    assert "Help me plan something good with Maya for Saturday." in history_bodies
  end

  test "WS-10 integration: the history comes from the TARGET session even when another session is active" do
    cid = maya_thread!()
    session = scoped_session!(cid)

    # A new unscoped session becomes the active one; the scoped
    # session's history must still be its own (pre-fix assembly
    # re-derived history from the active session instead).
    assert {:ok, _} = OpalConversations.start_new_chat(alex())

    assert {:ok, ctx} = OpalContext.assemble(alex(), "hello", nil, session: session)
    history_bodies = Enum.map(ctx.conversation_history, & &1.body)
    assert "Help me plan something good with Maya for Saturday." in history_bodies
  end

  test "WS-10 integration: posting the shape ask into Maya's orbit returns the scoped draft end to end" do
    cid = maya_thread!()
    session = scoped_session!(cid)

    assert {:ok, {_conv, _user_msg, opal_msg}} =
             OpalConversations.create_user_message(alex(), @shape_ask,
               conversation_id: session.id
             )

    assert opal_msg.body == "Yes — let's talk tonight about Saturday."
    refute opal_msg.body =~ "You mentioned Maya"

    # The scope that produced it rides the reply's own snapshot, so
    # the provenance is inspectable on the record.
    snapshot = opal_msg.metadata["context_snapshot"]
    assert snapshot["orbit_scope"]["person"]["display_name"] == "Maya"
    thread_bodies = Enum.map(snapshot["orbit_scope"]["thread"]["messages"], & &1["body"])
    assert @maya_ask in thread_bodies
  end
end
