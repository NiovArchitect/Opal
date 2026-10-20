defmodule OpalCore.SocialFlow.R20LimboWindowTextTest do
  @moduledoc """
  R20 F-16 pin: a plan in limbo FOR THE VIEWER carries the finished
  remaining-window text on the ONE etiquette projection the plan
  contract serves (`SocialFlow.plan_payload/2`), for both parties -
  so Graphs cards and deck cards can render the cooling treatment
  plus the remaining window in words without deriving anything.

  Setup mirrors the I2 wiring pins: the lifecycle opens through the
  real graph-create door, the window is set through the real write
  path, and time advances only through `NonResponseEtiquette.advance/2`
  (the stage worker's own entry).
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo
  alias OpalCore.SocialFlow

  alias OpalCore.SocialFlow.{
    FollowThrough,
    NonResponseEtiquette,
    SharedPlan,
    TemporalFollowThroughLoop
  }

  @hour 3600

  defp fresh_user(name) do
    suffix = Ecto.UUID.generate() |> String.slice(0, 8)

    %User{}
    |> User.changeset(%{id: Ecto.UUID.generate(), handle: "r20-#{suffix}", display_name: name})
    |> Repo.insert!()
  end

  defp set_mode(user, level) do
    {:ok, _} =
      FollowThrough.update_preferences(user.id, %{
        assistance_level: level,
        timezone: "UTC",
        quiet_hours_start: "12:00",
        quiet_hours_end: "12:00"
      })

    :ok
  end

  defp make_circle(creator, recipient) do
    %RelationshipType{}
    |> RelationshipType.changeset(%{
      user_id: creator.id,
      contact_user_id: recipient.id,
      type: "friend"
    })
    |> Repo.insert!()
  end

  defp loop_for(plan_id, recipient_id) do
    from(l in TemporalFollowThroughLoop,
      where: l.plan_id == ^plan_id and l.kind == "invitation_response",
      where: fragment("? ->> 'recipient_user_id' = ?", l.metadata, ^recipient_id)
    )
    |> Repo.one()
  end

  defp requested_at(loop) do
    {:ok, dt, _} = DateTime.from_iso8601(loop.metadata["requested_at"])
    dt
  end

  test "limbo on the plan contract carries remaining_window_text for both viewers" do
    creator = fresh_user("Cara Creator")
    recipient = fresh_user("Sam Guest")
    set_mode(recipient, "proactive")
    make_circle(creator, recipient)

    {:ok, plan, _participants, false} =
      SocialFlow.create_plan_from_graph_create(creator.id, %{
        "title" => "R20 limbo dinner #{System.unique_integer([:positive])}",
        "participant_user_ids" => [recipient.id]
      })

    # No limbo before the lifecycle reaches a limbo stage: the
    # contract carries no remaining-window line to invent from.
    before_window = SocialFlow.plan_payload(plan, creator.id)["etiquette"]
    assert before_window["limbo"] == nil

    assert {:ok, _plan} =
             SocialFlow.set_plan_response_window(%{
               plan_id: plan.id,
               user_id: creator.id,
               recipient_id: recipient.id,
               window_seconds: 48 * @hour
             })

    plan = Repo.get!(SharedPlan, plan.id)
    loop = loop_for(plan.id, recipient.id)
    t0 = requested_at(loop)
    {:ok, closes, _} = DateTime.from_iso8601(loop.metadata["window_closes_at"])
    total = DateTime.diff(closes, t0, :second)

    {:ok, :nudged} =
      NonResponseEtiquette.advance(loop.id,
        now: DateTime.add(t0, div(total, 2) + 60, :second),
        stage: "awaiting"
      )

    # Three quarters through the window: a quarter (about 12 hours of
    # the 48) remains, and BOTH viewers' projections say so in words.
    mid = DateTime.add(closes, -div(total, 4), :second)

    for viewer_id <- [creator.id, recipient.id] do
      view = NonResponseEtiquette.viewer_projection(plan.id, viewer_id, now: mid)
      assert view["limbo"]["state"] == "limbo"
      assert view["limbo"]["treatment"] == "cooling"

      text = view["limbo"]["remaining_window_text"]
      assert is_binary(text)
      assert text =~ "left in the answer window"
      assert text =~ "hours"
    end

    # And it rides the contract builder itself, not only the direct
    # projection call.
    contract = SocialFlow.plan_payload(plan, recipient.id)["etiquette"]
    assert contract["limbo"]["state"] == "limbo"
    assert is_binary(contract["limbo"]["remaining_window_text"])
  end

  test "remaining_window_text speaks in days for long windows and never invents one" do
    now = DateTime.utc_now()

    loop = %TemporalFollowThroughLoop{
      metadata: %{
        "requested_at" => DateTime.to_iso8601(now),
        "window_closes_at" => DateTime.to_iso8601(DateTime.add(now, 5 * 86_400, :second))
      }
    }

    assert NonResponseEtiquette.remaining_window_text(loop, "nudged", now) ==
             "About 5 days left in the answer window."

    # No window metadata at all: the fork fallback still yields a
    # deadline from requested_at, so the line exists; a loop with no
    # requested_at either derives from now - the text always names a
    # real remaining span or the closing-now line, never a guess at
    # someone else's window.
    closing = %TemporalFollowThroughLoop{
      metadata: %{
        "requested_at" => DateTime.to_iso8601(DateTime.add(now, -10 * 86_400, :second)),
        "window_closes_at" => DateTime.to_iso8601(DateTime.add(now, -60, :second))
      }
    }

    assert NonResponseEtiquette.remaining_window_text(closing, "nudged", now) ==
             "The answer window is closing now."
  end
end
