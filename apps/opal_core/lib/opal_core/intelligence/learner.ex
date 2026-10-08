defmodule OpalCore.Intelligence.Learner do
  @moduledoc """
  Paste D — Learner surface documentation + thin facade.

  ## D0 Ground truth

  **FeedbackLoop** (`OpalCore.Intelligence.FeedbackLoop`):
  signals `accepted | dismissed | ignored | counter_proposed` → `Feedback` row +
  vibe delta on `VibeProfile`. Paste D1 also captures `outcome_signals`.

  **Call pipeline:** `CallSession` durable metadata (caller/callee/status/timestamps);
  SDP/ICE ephemeral. Call-ended hook: `Calls.end_call` → `EventIngestor` `call.ended`
  → optional `CallTranscription.after_call_ended/1` (AssistConsent-gated).

  **Permissions:**
  - Location: `NSLocationWhenInUseUsageDescription` declared; reuse convoy permission;
    EnvironmentContext stores **coarse only, never GPS**.
  - Calendar: **no** `NSCalendars*` plist → calendar section `:unavailable` until integration.
  - Contacts: declared; soft deny OK.

  **Pre-call UX:** No dedicated prep screen between tap and connect (`deriveCallView`
  ringing/connecting). Pre-call intelligence delivers an **Opal Center message** to the
  caller (`CallIntelligence.pre_call_brief/2`) — fact-only, caller-scoped.
  """

  alias OpalCore.Intelligence.{CallIntelligence, EnvironmentContext, OutcomeLearning}

  defdelegate record_outcome(attrs), to: OutcomeLearning, as: :record
  defdelegate learned_preferences(account_id), to: OutcomeLearning
  defdelegate pre_call_brief(caller_id, callee_id), to: CallIntelligence
  defdelegate post_call_note(caller_id, attrs), to: CallIntelligence
  defdelegate get_environment_context(account_id, opts \\ []), to: EnvironmentContext
end
