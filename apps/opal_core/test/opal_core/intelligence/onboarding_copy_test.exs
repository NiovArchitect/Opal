defmodule OpalCore.Intelligence.OnboardingCopyTest do
  use ExUnit.Case, async: false

  alias OpalCore.Intelligence.OnboardingCopy

  setup do
    prev_key = System.get_env("OPAL_LLM_API_KEY")
    prev_provider = System.get_env("OPAL_LLM_PROVIDER")
    System.delete_env("OPAL_LLM_API_KEY")

    on_exit(fn ->
      restore_env("OPAL_LLM_API_KEY", prev_key)
      restore_env("OPAL_LLM_PROVIDER", prev_provider)
    end)

    :ok
  end

  test "disabled LLM returns exact template floor for greeting" do
    template =
      "Hey, I'm Opal. I keep up with your people so you don't have to - birthdays, making plans, staying in touch. Who's someone you've been meaning to catch up with?"

    assert {:ok, %{text: ^template, source: "template"}} =
             OnboardingCopy.draft("acct-onboarding-1", %{
               "moment" => "greeting",
               "template" => template
             })
  end

  test "disabled LLM returns exact ask_more template with name" do
    template = "Got it - Maya. Want to add anyone else, or shall we plan something with Maya?"

    assert {:ok, %{text: ^template, source: "template"}} =
             OnboardingCopy.draft("acct-onboarding-1", %{
               moment: "ask_more",
               template: template,
               name: "Maya"
             })
  end

  test "rejects legal/trust moments" do
    assert {:error, :legal_template_only} =
             OnboardingCopy.draft("acct-onboarding-1", %{
               "moment" => "will_send",
               "template" => "Send this one message"
             })
  end

  test "requires template" do
    assert {:error, :template_required} =
             OnboardingCopy.draft("acct-onboarding-1", %{"moment" => "greeting", "template" => ""})
  end

  test "unknown moment rejected" do
    assert {:error, :unknown_moment} =
             OnboardingCopy.draft("acct-onboarding-1", %{
               "moment" => "not_a_moment",
               "template" => "hi"
             })
  end

  defp restore_env(key, nil), do: System.delete_env(key)
  defp restore_env(key, val), do: System.put_env(key, val)
end
