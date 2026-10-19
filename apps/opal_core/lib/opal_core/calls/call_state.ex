defmodule OpalCore.Calls.CallState do
  @moduledoc """
  Repair #19 (W2) - THE CALL'S STATE, derived once, in the service
  layer (MP-3 single-source law). Every call-log row on every surface
  renders this finished fact as its ambient border; the front end
  never re-derives it from the row's raw fields.

  The state is the indicator family (communication-model section 9):

  - "action" (#FF4D5E) - the call wants resolving by THIS viewer:
    * reason "missed_unresolved" - an incoming call the viewer missed
      (the server's own history label says "Missed call") and no
      later call with the same peer has connected since; the miss is
      still open business. A later connected call with that peer
      resolves it (the row then falls through to its plan state or
      to settled) - the state CHANGE is the point: the border is a
      live derivation, not a paint.
    * reason "plan_action" - the viewer and this peer share an
      upcoming plan (the DIR-1 NextPlan fact riding the same row)
      whose indicator state is "action": the plan awaits the
      viewer's own answer.
  - "happening" (#00E5FF) - the call is live right now
    (reason "call_live": status ringing / initiated / answered), or
    the shared plan's live window is open (reason "plan_happening").
  - "ready" (#FFC86B) - the shared upcoming plan is agreed and
    settled-ready (reason "plan_ready"); nothing is required of the
    viewer, the call's business is prepared.
  - "forming" (#8B5CF6) - the shared upcoming plan is still taking
    shape (reason "plan_forming").
  - "past" (white) - settled: the call is complete history and no
    shared upcoming plan is in motion (reason "settled"). The calm
    treatment - the stone at rest.

  Priority is urgency, stated once here: an unresolved miss outranks
  a live plan state (the callback is still owed even if a plan is
  ready); a live call outranks the plan states; then the plan's own
  state; then settled. Inputs are ONLY the row's own governed fields
  (its missed flag / status, computed by Calls.project/2 from the
  CallSession record), the row's NextPlan fact, and whether a later
  connected call with the same peer exists in the same log read -
  all computed by Calls.list_for/1, never by a surface.
  """

  @doc """
  The finished call-state fact for one projected call row.

  - `row` - the Calls.project/2 map for the row (string keys:
    "missed", "status").
  - `next_plan` - the row's DIR-1 NextPlan fact map, or nil.
  - `later_connected?` - true when a NEWER call with the same peer
    in the same log read has media_connected_at set (someone has
    actually spoken with this peer since).
  """
  def derive(row, next_plan, later_connected?)

  def derive(%{"missed" => true}, _next_plan, false) do
    fact("action", "missed_unresolved", "Call back")
  end

  def derive(%{"status" => status}, _next_plan, _later_connected?)
      when status in ["ringing", "initiated", "answered"] do
    fact("happening", "call_live", "Live now")
  end

  def derive(_row, %{"state" => state}, _later_connected?)
      when state in ["action", "forming", "ready", "happening"] do
    case state do
      "action" -> fact("action", "plan_action", "Needs your answer")
      "forming" -> fact("forming", "plan_forming", "Taking shape")
      "ready" -> fact("ready", "plan_ready", "Ready")
      "happening" -> fact("happening", "plan_happening", "Happening now")
    end
  end

  def derive(_row, _next_plan, _later_connected?) do
    fact("past", "settled", "Settled")
  end

  defp fact(state, reason, label) do
    %{"state" => state, "reason" => reason, "label" => label}
  end
end
