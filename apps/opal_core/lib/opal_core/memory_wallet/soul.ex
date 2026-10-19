defmodule OpalCore.MemoryWallet.Soul do
  @moduledoc """
  W-GAP-31 first form - the Soul, in wallet terms: how Opal is with
  THIS user, held in the EXISTING assistance-preference truth.

  There is deliberately NO parallel preference store here. The soul
  reads and writes `OpalCore.SocialFlow.AssistancePreference` through
  the existing preference path (`FollowThrough.get_or_create_preferences/1`
  / `update_preferences/2`) - the same record AttentionBudget and
  TravelMode already read - so a Soul edit changes the real truth
  those systems obey, and reads back from it. The fields the Soul
  card owns, in the user's words:

  - how forward Opal may be (`assistance_level`)
  - quiet hours (`quiet_hours_start` / `quiet_hours_end`)
  - the home time zone quiet hours are judged in (`timezone`)
  - how many proactive signals a day is too many
    (`max_proactive_signals_per_day`)
  - how much completion feedback Opal gives (`completion_feedback`)
  """

  alias OpalCore.SocialFlow.{AssistancePreference, FollowThrough}

  @editable_atoms [
    :assistance_level,
    :quiet_hours_start,
    :quiet_hours_end,
    :timezone,
    :max_proactive_signals_per_day,
    :completion_feedback
  ]

  @level_labels %{
    "minimal" => "Only when I ask",
    "balanced" => "A balanced amount of help",
    "proactive" => "More forward, within my quiet hours"
  }

  def level_labels, do: @level_labels

  @doc "The soul contract - the real assistance-preference truth, in plain words."
  def soul_for(owner_user_id) when is_binary(owner_user_id) do
    case FollowThrough.get_or_create_preferences(owner_user_id) do
      {:ok, %AssistancePreference{} = pref} -> {:ok, to_contract(pref)}
      other -> other
    end
  end

  def soul_for(_), do: {:error, :owner_required}

  @doc """
  Edit the soul. Only the whitelisted real fields are taken; the
  write goes to the same store the Soul card reads, and the
  returned contract is the read-back of what was saved.
  """
  def update_soul(owner_user_id, attrs) when is_binary(owner_user_id) and is_map(attrs) do
    clean =
      for field <- @editable_atoms,
          value = attrs[Atom.to_string(field)] || attrs[field],
          not is_nil(value),
          into: %{} do
        {field, cast_value(field, value)}
      end

    if clean == %{} do
      {:error, :nothing_to_save}
    else
      case FollowThrough.update_preferences(owner_user_id, clean) do
        {:ok, %AssistancePreference{} = pref} -> {:ok, to_contract(pref)}
        {:error, changeset} -> {:error, changeset}
      end
    end
  end

  def update_soul(_, _), do: {:error, :invalid}

  def to_contract(%AssistancePreference{} = pref) do
    base = AssistancePreference.to_contract(pref)

    Map.merge(base, %{
      "assistance_level_label" => @level_labels[pref.assistance_level] || pref.assistance_level,
      # Repair #19 W20 (JA-07): start == end is the resolver's
      # DISABLED state (SocialFlow.QuietHours edge rule) — the
      # read-back label says so honestly instead of printing a
      # zero-length window as if it were a real one.
      "quiet_hours_label" =>
        if(pref.quiet_hours_start == pref.quiet_hours_end,
          do: "Quiet hours are off",
          else: "Quiet hours - #{pref.quiet_hours_start} to #{pref.quiet_hours_end}"
        )
    })
  end

  defp cast_value(:max_proactive_signals_per_day, value) when is_binary(value) do
    case Integer.parse(value) do
      {n, ""} -> n
      _ -> value
    end
  end

  defp cast_value(_, value), do: value
end
