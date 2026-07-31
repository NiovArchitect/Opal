defmodule OpalCore.Fixtures do
  @moduledoc """
  Synthetic Slice 1 fixture identifiers.

  No real phone numbers, contact data, or personal communications.
  """

  @user_alex "a1111111-1111-4111-8111-111111111111"
  @user_jordan "a2222222-2222-4222-8222-222222222222"
  @user_taylor "a3333333-3333-4333-8333-333333333333"

  @conv_alex_jordan "b1111111-1111-4111-8111-111111111111"
  @conv_alex_taylor "b2222222-2222-4222-8222-222222222222"

  @consent_alex_jordan_granted "c1111111-1111-4111-8111-111111111111"
  @consent_jordan_denied "c2222222-2222-4222-8222-222222222222"
  @consent_alex_taylor_revoked "c3333333-3333-4333-8333-333333333333"
  @consent_taylor_expired "c4444444-4444-4444-8444-444444444444"

  def user_alex_id, do: @user_alex
  def user_jordan_id, do: @user_jordan
  def user_taylor_id, do: @user_taylor

  def conv_alex_jordan_id, do: @conv_alex_jordan
  def conv_alex_taylor_id, do: @conv_alex_taylor

  def consent_alex_jordan_granted_id, do: @consent_alex_jordan_granted
  def consent_jordan_denied_id, do: @consent_jordan_denied
  def consent_alex_taylor_revoked_id, do: @consent_alex_taylor_revoked
  def consent_taylor_expired_id, do: @consent_taylor_expired

  def policy_version, do: "slice1-0.1.0"
end
