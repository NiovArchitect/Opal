# Development-only: inject one FINAL authenticated transcript segment into the
# same production path Deepgram uses after ASR (Assist.accept_transcript →
# VoiceAlignment → ConversationAlignment.fold/3).
#
# Does NOT mutate SharedPlan directly, insert a chat message, or call a
# separate voice planner.
#
# Usage:
#   cd apps/opal_core && MIX_ENV=dev mix run scripts/dev_inject_final_transcript.exs
#
# Env overrides:
#   DEV_TRANSCRIPT_TEXT          default: Actually, let's make it eight.
#   DEV_TRANSCRIPT_FINAL         default: true  (false = interim)
#   DEV_TRANSCRIPT_CONFIDENCE    default: 0.92
#   DEV_PROVIDER_SEGMENT_ID      default: unique development_fixture id
#   DEV_SPEAKER_USER_ID          default: Walk A
#   DEV_CONVERSATION_ID          default: Fort Oak Walk A/B conversation

if Mix.env() != :dev do
  IO.puts("REFUSED: development-only transcript injection")
  System.halt(1)
end

alias OpalCore.Calls
alias OpalCore.Calls.Assist
alias OpalCore.Repo
alias OpalCore.Accounts.User

walk_a = "47aa5856-8c56-4b18-a4d4-6a9b456516a8"
walk_b = "b599fcd7-7a97-4736-8221-86e0a6d8dc7a"
conversation_id = System.get_env("DEV_CONVERSATION_ID") || "ace99adc-db67-4258-9d95-f612246c6c84"
speaker_user_id = System.get_env("DEV_SPEAKER_USER_ID") || walk_a

text = System.get_env("DEV_TRANSCRIPT_TEXT") || "Actually, let's make it eight."

final? =
  case System.get_env("DEV_TRANSCRIPT_FINAL") do
    "false" -> false
    "0" -> false
    _ -> true
  end

confidence =
  case System.get_env("DEV_TRANSCRIPT_CONFIDENCE") do
    nil -> 0.92
    raw -> String.to_float(raw)
  end

provider_segment_id =
  System.get_env("DEV_PROVIDER_SEGMENT_ID") ||
    "dev-fixture-#{System.system_time(:millisecond)}"

# Open a short-lived answered+media-connected call so Assist.accept_transcript
# can run the production post-ASR path. Marked ended_reason=harness so it is
# excluded from call history (see Calls.list_for/1).
{:ok, call} = Calls.invite_in_conversation(walk_a, conversation_id, %{})
{:ok, _} = Calls.answer(call.id, walk_b)
{:ok, live} = Calls.mark_media_connected(call.id, walk_a)

_ = Assist.set_allowed(live.id, walk_a, true)
_ = Assist.set_allowed(live.id, walk_b, true)

attrs = %{
  "text" => text,
  "final" => final?,
  "confidence" => confidence,
  "provider" => "development_fixture",
  "provider_segment_id" => provider_segment_id
}

result = Assist.accept_transcript(live.id, speaker_user_id, attrs)

# Close harness session so it does not block later real calls.
_ = Calls.end_call_session(live.id, walk_a, "harness")

case result do
  {:ok, payload} ->
    IO.puts("DEV_INJECT_OK")
    IO.puts("CALL_ID=#{live.id}")
    IO.puts("CONVERSATION_ID=#{conversation_id}")
    IO.puts("SPEAKER_USER_ID=#{speaker_user_id}")
    IO.puts("PROVIDER_SEGMENT_ID=#{provider_segment_id}")
    IO.puts("FINAL=#{final?}")
    IO.puts("TEXT=#{text}")
    IO.puts("CONFIDENCE=#{confidence}")
    IO.puts("PERSISTED=#{payload[:persisted] || payload["persisted"]}")
    IO.puts("FOLDED=#{payload[:folded] || payload["folded"]}")
    IO.puts("SEGMENT_ID=#{payload[:segment_id] || payload["segment_id"]}")

  {:error, reason} ->
    IO.puts("DEV_INJECT_ERROR=#{inspect(reason)}")
    System.halt(1)
end

# Silence unused alias warning in some Mix versions
_ = Repo
_ = User
