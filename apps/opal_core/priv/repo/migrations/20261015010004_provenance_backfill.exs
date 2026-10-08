defmodule OpalCore.Repo.Migrations.ProvenanceBackfill do
  use Ecto.Migration

  def up do
    # Per-entry: add provenance=observed where missing on known_facts map values
    execute("""
    UPDATE person_memories
    SET known_facts = (
      SELECT COALESCE(jsonb_object_agg(
        key,
        CASE
          WHEN jsonb_typeof(value) = 'object' AND NOT (value ? 'provenance') THEN
            value || jsonb_build_object('provenance', 'observed')
          ELSE value
        END
      ), '{}'::jsonb)
      FROM jsonb_each(COALESCE(known_facts, '{}'::jsonb)) AS t(key, value)
    )
    WHERE known_facts IS NOT NULL AND known_facts <> '{}'::jsonb
    """)

    execute("""
    UPDATE routines SET provenance = 'observed'
    WHERE provenance IS NULL OR provenance = ''
    """)

    execute("""
    UPDATE social_patterns SET provenance = 'observed'
    WHERE provenance IS NULL OR provenance = ''
    """)

    execute("""
    UPDATE temporal_anchors SET provenance = 'observed'
    WHERE provenance IS NULL OR provenance = ''
    """)

    # Distribution log for operators
    execute("""
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      RAISE NOTICE 'provenance_backfill.known_facts_distribution:';
      FOR r IN
        SELECT COALESCE(value->>'provenance', 'missing') AS p, count(*) AS c
        FROM person_memories, jsonb_each(known_facts) AS t(key, value)
        GROUP BY 1
      LOOP
        RAISE NOTICE '  % => %', r.p, r.c;
      END LOOP;
    END $$;
    """)
  end

  def down do
    :ok
  end
end
