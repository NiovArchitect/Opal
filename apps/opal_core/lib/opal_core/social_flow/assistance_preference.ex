defmodule OpalCore.SocialFlow.AssistancePreference do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "user_assistance_preferences" do
    field :assistance_level, :string, default: "balanced"
    field :quiet_hours_start, :string, default: "22:00"
    field :quiet_hours_end, :string, default: "08:00"
    field :timezone, :string, default: "UTC"
    field :max_proactive_signals_per_day, :integer, default: 3
    field :private_reminder_channel, :string, default: "in_app"
    field :completion_feedback, :string, default: "standard"
    field :motion_preference, :string, default: "system"
    field :shadow_mode, :boolean, default: false
    # Paste E2 — cold-start maturity
    field :intelligence_maturity, :string, default: "new"
    field :onboarding_seed_completed_at, :utc_datetime_usec
    field :learning_questions_on, :date
    field :learning_questions_count, :integer, default: 0

    belongs_to :user, OpalCore.Accounts.User

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(p, attrs) do
    p
    |> cast(attrs, [
      :user_id,
      :assistance_level,
      :quiet_hours_start,
      :quiet_hours_end,
      :timezone,
      :max_proactive_signals_per_day,
      :private_reminder_channel,
      :completion_feedback,
      :motion_preference,
      :shadow_mode,
      :intelligence_maturity,
      :onboarding_seed_completed_at,
      :learning_questions_on,
      :learning_questions_count
    ])
    |> validate_required([:user_id, :assistance_level, :timezone])
    |> validate_inclusion(:assistance_level, ~w(minimal balanced proactive))
    |> validate_inclusion(:completion_feedback, ~w(standard reduced))
    |> validate_inclusion(:motion_preference, ~w(system reduced))
    |> validate_inclusion(:intelligence_maturity, ~w(new learning established))
    |> validate_number(:max_proactive_signals_per_day, greater_than: 0, less_than_or_equal_to: 10)
    |> unique_constraint(:user_id)
  end

  def to_contract(%__MODULE__{} = p) do
    %{
      "user_id" => p.user_id,
      "assistance_level" => p.assistance_level,
      "quiet_hours_start" => p.quiet_hours_start,
      "quiet_hours_end" => p.quiet_hours_end,
      "timezone" => p.timezone,
      "max_proactive_signals_per_day" => p.max_proactive_signals_per_day,
      "completion_feedback" => p.completion_feedback,
      "motion_preference" => p.motion_preference,
      "shadow_mode" => p.shadow_mode,
      "intelligence_maturity" => p.intelligence_maturity
    }
  end
end
