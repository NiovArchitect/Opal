defmodule OpalCore.Repo.Migrations.CreateRelationshipBehaviorProfiles do
  use Ecto.Migration

  def up do
    create table(:relationship_behavior_profiles, primary_key: false) do
      add :relationship_type, :string, primary_key: true
      add :tone, :string, null: false
      add :proactivity, :string, null: false
      add :disclosure, :string, null: false
      add :formality_floor, :string, null: false
      add :boundary_notes, :text

      timestamps(type: :utc_datetime_usec)
    end

    # Additive only: per-person override map on person_memories
    alter table(:person_memories) do
      add :behavior_override, :map
    end

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    # Seed ALL RU-1 taxonomy types (OpalCore.Relationships.RelationshipType.allowed_types/0)
    execute("""
    INSERT INTO relationship_behavior_profiles
      (relationship_type, tone, proactivity, disclosure, formality_floor, boundary_notes, inserted_at, updated_at)
    VALUES
      ('spouse', 'warm_intimate', 'high', 'volunteers', 'warm_intimate',
       'Highest intimacy; spontaneous planning OK; volunteer plans and soft reminders freely.',
       '#{now}', '#{now}'),
      ('partner', 'warm_intimate', 'high', 'volunteers', 'warm_casual',
       'Romantic partner (not married). Warm, proactive; still respect stated boundaries.',
       '#{now}', '#{now}'),
      ('family', 'warm_respectful', 'medium', 'balanced', 'warm_respectful',
       'Parent/child/sibling. Prefer planned contact; warmth without over-familiar slang.',
       '#{now}', '#{now}'),
      ('close_friend', 'warm_casual', 'high', 'volunteers', 'warm_casual',
       'Inner circle. Spontaneous OK; volunteer hangouts; playful tone fine.',
       '#{now}', '#{now}'),
      ('friend', 'warm_casual', 'medium', 'balanced', 'friendly_respectful',
       'Social friend. Suggest plans when natural; do not over-initiate.',
       '#{now}', '#{now}'),
      ('business', 'friendly_respectful', 'low', 'reserved', 'friendly_respectful',
       'Work contact. Never drop below friendly_respectful. Planned, concise, no intimacy.',
       '#{now}', '#{now}'),
      ('acquaintance', 'polite_brief', 'low', 'reserved', 'polite_brief',
       'Knows them lightly. Wait to be asked; brief and polite. UNDERCONFIDENT-SAFE default.',
       '#{now}', '#{now}')
    ON CONFLICT (relationship_type) DO NOTHING;
    """)
  end

  def down do
    alter table(:person_memories) do
      remove :behavior_override
    end

    drop table(:relationship_behavior_profiles)
  end
end
