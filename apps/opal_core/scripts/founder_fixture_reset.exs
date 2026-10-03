# Development-only residue cleanup for Walk A / Walk B fixture users ONLY.
# Never broad-deletes. Refuses outside Mix env :dev.
#
#   cd apps/opal_core && mix run scripts/founder_fixture_reset.exs
#
# Actions (scoped to fixture membership):
#   1) Delete message bodies matching shell-geo / P046gate / SOAK-* / SF17 harness
#      in conversations where Walk A or Walk B is a member
#   2) Soft-exclude lab call_sessions for Walk A/B by setting ended_reason=harness
#      (Calls.list_for already hides harness)
#   3) Soft-delete demo bootstrap social_moments authored by Walk A/B
#
# Does NOT delete Fort Oak conversation, SharedPlan, or non-fixture users' data.

if Mix.env() != :dev do
  IO.puts("REFUSED: founder_fixture_reset is development-only.")
  System.halt(1)
end

alias OpalCore.Repo

walk_a = "47aa5856-8c56-4b18-a4d4-6a9b456516a8"
walk_b = "b599fcd7-7a97-4736-8221-86e0a6d8dc7a"
fort_oak = "ace99adc-db67-4258-9d95-f612246c6c84"

fixture_ids =
  [walk_a, walk_b]
  |> Enum.map(fn id ->
    {:ok, bin} = Ecto.UUID.dump(id)
    bin
  end)

demo_captions = [
  "Published Memory from Opal Graph",
  "Golden hour hike with the crew.",
  "Sunset walk at Fletcher Cove"
]

{:ok, %{rows: member_convs}} =
  Repo.query(
    """
    SELECT DISTINCT conversation_id
    FROM conversation_members
    WHERE user_id = ANY($1)
    """,
    [fixture_ids]
  )

conv_ids = Enum.map(member_convs, fn [id] -> id end)

IO.puts("FIXTURE_MEMBER_CONVERSATIONS=#{length(conv_ids)}")

{:ok, %{num_rows: deleted_messages}} =
  if conv_ids == [] do
    {:ok, %{num_rows: 0}}
  else
    Repo.query(
      """
      DELETE FROM messages
      WHERE conversation_id = ANY($1)
        AND (
          body ~* '^(shell-geo\\y|P046gate\\y|SOAK-|SF17\\y|SAFRT)'
          OR body ~* 'shell-geo unread'
          OR body = 'P046gate'
        )
      """,
      [conv_ids]
    )
  end

IO.puts("DELETED_RESIDUE_MESSAGES=#{deleted_messages} (Fort Oak kept; only residue bodies)")

# Lab residue only: failed / never-connected / explicit lab correlation.
# Connected media calls for Walk A/B are left alone (Track B remains RED).
{:ok, %{num_rows: harnessed_calls}} =
  Repo.query(
    """
    UPDATE call_sessions
    SET ended_reason = 'harness',
        updated_at = NOW()
    WHERE (caller_user_id = ANY($1) OR callee_user_id = ANY($1))
      AND (ended_reason IS NULL OR ended_reason <> 'harness')
      AND (
        ended_reason IN ('media_failed', 'failed', 'mic_denied')
        OR (media_connected_at IS NULL AND status IN ('ended', 'failed', 'missed', 'canceled'))
        OR COALESCE(correlation_id, '') ILIKE '%lab%'
        OR COALESCE(correlation_id, '') ILIKE '%soak%'
        OR COALESCE(correlation_id, '') ILIKE '%proof%'
      )
    """,
    [fixture_ids]
  )

IO.puts("HARNESSED_LAB_CALL_SESSIONS=#{harnessed_calls}")

{:ok, %{num_rows: soft_deleted_moments}} =
  Repo.query(
    """
    UPDATE social_moments
    SET deleted_at = NOW(),
        moderation_state = 'removed',
        updated_at = NOW()
    WHERE author_user_id = ANY($1)
      AND deleted_at IS NULL
      AND caption = ANY($2)
    """,
    [fixture_ids, demo_captions]
  )

IO.puts("SOFT_DELETED_DEMO_SOCIAL_MOMENTS=#{soft_deleted_moments}")

IO.puts(
  "OK fort_oak=#{fort_oak} walk_a=#{walk_a} walk_b=#{walk_b} TRACK_B_COMMIT=NO"
)
