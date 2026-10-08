defmodule OpalCore.Bookings.Service do
  @moduledoc """
  Conversation-flow booking orchestration.

  Without a configured provider, returns an honest disabled message and never
  invents confirmation-shaped fields.
  """

  import Ecto.Query

  alias OpalCore.Bookings.{Booking, Duffel, MockProvider, OpenTable}
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.{Commitment, PlanMemory}

  @disabled_message "I can't book flights yet — a booking provider isn't connected. Want me to find options anyway?"

  @doc """
  Entry for conversational booking intent.

  Returns either a disabled honesty map or a draft booking + search results.
  """
  def handle_booking_request(account_id, attrs) when is_binary(account_id) and is_map(attrs) do
    params = stringify(attrs)
    booking_type = normalize_type(params["booking_type"] || params["type"])
    opts = provider_opts(params)

    if provider_ready?(booking_type, opts) do
      search(account_id, Map.put(params, "booking_type", booking_type || "flight"), opts)
    else
      {:ok, disabled_response(booking_type)}
    end
  end

  def handle_booking_request(_, _), do: {:error, :invalid}

  @doc "Search via the resolved provider and persist a draft/searched booking row."
  def search(account_id, attrs, opts \\ [])

  def search(account_id, attrs, opts) when is_binary(account_id) and is_map(attrs) do
    params = stringify(attrs)
    booking_type = normalize_type(params["booking_type"] || params["type"]) || "flight"
    opts = Keyword.merge(provider_opts(params), opts)
    provider_mod = resolve_provider(booking_type, opts)

    case provider_mod.search(Map.put(params, "booking_type", booking_type), opts) do
      {:disabled, reason} ->
        {:ok, disabled_response(booking_type, reason)}

      {:error, reason} ->
        {:error, reason}

      {:ok, results} ->
        {:ok, booking} =
          %Booking{}
          |> Booking.changeset(%{
            account_id: account_id,
            booking_type: booking_type,
            status: "searched",
            details: Map.merge(params, %{"results" => results}),
            constraints: params["constraints"] || %{},
            provider: provider_name(provider_mod),
            conversation_id: params["conversation_id"],
            plan_id: params["plan_id"],
            metadata: params["metadata"] || %{}
          })
          |> Repo.insert()

        {:ok,
         %{
           kind: :search_results,
           booking: to_contract(booking),
           results: results,
           bookable: Enum.any?(results, &truthy?(&1["bookable"]))
         }}
    end
  end

  def search(_, _, _), do: {:error, :invalid}

  @doc """
  Confirm a booking: call provider book, persist confirmation, write plan_memory
  + commitment_ledger.
  """
  def confirm(account_id, attrs, opts \\ [])

  def confirm(account_id, attrs, opts) when is_binary(account_id) and is_map(attrs) do
    params = stringify(attrs)
    opts = Keyword.merge(provider_opts(params), opts)

    with {:ok, booking} <- load_booking(account_id, params),
         provider_mod <- resolve_provider(booking.booking_type, opts),
         book_params <- book_params(booking, params),
         {:ok, provider_result} <- provider_mod.book(book_params, opts) do
      conf = provider_result["confirmation_number"]
      provider_ref = provider_result["provider_ref"]

      Repo.transaction(fn ->
        {:ok, updated} =
          booking
          |> Booking.changeset(%{
            status: "confirmed",
            provider: provider_result["provider"] || booking.provider,
            provider_ref: provider_ref,
            confirmation_number: conf,
            details: Map.merge(booking.details || %{}, %{"provider_result" => provider_result}),
            amount_cents: params["amount_cents"] || booking.amount_cents,
            currency: params["currency"] || booking.currency || "USD"
          })
          |> Repo.update()

        plan_id = updated.plan_id || updated.id
        conversation_id = updated.conversation_id || synthetic_conversation_id(account_id)

        source_message_id =
          case params["source_message_id"] do
            id when is_binary(id) and byte_size(id) == 36 -> id
            _ -> Ecto.UUID.generate()
          end

        _ = write_plan_memory(account_id, plan_id, conversation_id, updated)
        _ = write_commitment(account_id, conversation_id, source_message_id, updated)

        %{
          kind: :confirmed,
          booking: to_contract(updated),
          confirmation_number: conf
        }
      end)
      |> case do
        {:ok, result} -> {:ok, result}
        {:error, reason} -> {:error, reason}
      end
    else
      {:disabled, reason} ->
        {:ok, disabled_response(nil, reason)}

      {:error, _} = err ->
        err
    end
  end

  def confirm(_, _, _), do: {:error, :invalid}

  @doc "Cancel a confirmed/searched booking via provider when possible."
  def cancel(account_id, booking_id, opts \\ [])

  def cancel(account_id, booking_id, opts)
      when is_binary(account_id) and is_binary(booking_id) do
    with {:ok, booking} <- load_booking(account_id, %{"id" => booking_id}),
         provider_mod <- resolve_provider(booking.booking_type, opts) do
      case provider_mod.cancel(
             %{
               "provider_ref" => booking.provider_ref,
               "id" => booking.provider_ref,
               "confirmation_number" => booking.confirmation_number
             },
             opts
           ) do
        {:disabled, reason} ->
          {:ok, disabled_response(booking.booking_type, reason)}

        {:error, reason} ->
          {:error, reason}

        {:ok, result} ->
          {:ok, updated} =
            booking
            |> Booking.changeset(%{
              status: "cancelled",
              details: Map.merge(booking.details || %{}, %{"cancel_result" => result})
            })
            |> Repo.update()

          {:ok, %{kind: :cancelled, booking: to_contract(updated)}}
      end
    end
  end

  def cancel(_, _, _), do: {:error, :invalid}

  @doc "Fetch a booking owned by account_id."
  def get(account_id, id) when is_binary(account_id) and is_binary(id) do
    load_booking(account_id, %{"id" => id})
  end

  def get(_, _), do: {:error, :not_found}

  def to_contract(%Booking{} = b) do
    %{
      "id" => b.id,
      "account_id" => b.account_id,
      "booking_type" => b.booking_type,
      "status" => b.status,
      "details" => b.details,
      "constraints" => b.constraints,
      "provider" => b.provider,
      "provider_ref" => b.provider_ref,
      "confirmation_number" => b.confirmation_number,
      "conversation_id" => b.conversation_id,
      "plan_id" => b.plan_id,
      "amount_cents" => b.amount_cents,
      "currency" => b.currency,
      "metadata" => b.metadata
    }
  end

  # --- helpers ---

  defp disabled_response(booking_type, reason \\ nil) do
    message =
      case booking_type do
        "hotel" ->
          "I can't book hotels yet — a booking provider isn't connected. Want me to find options anyway?"

        "restaurant" ->
          "I can't book restaurants yet — OpenTable isn't connected for self-serve booking. Want me to find places to call?"

        "activity" ->
          "I can't book activities yet — a booking provider isn't connected. Want me to find options anyway?"

        _ ->
          @disabled_message
      end

    base = %{
      kind: :disabled,
      message: message,
      bookable: false
    }

    if is_binary(reason), do: Map.put(base, :reason, reason), else: base
  end

  defp provider_ready?(booking_type, opts) do
    cond do
      Keyword.get(opts, :allow_test_mock, false) == true -> true
      Keyword.get(opts, :use_mock, false) == true and Mix.env() == :test -> true
      booking_type in ["flight", "hotel", "activity"] -> present_env?("DUFFEL_API_KEY")
      booking_type == "restaurant" -> present_env?("OPENTABLE_API_KEY")
      is_nil(booking_type) -> present_env?("DUFFEL_API_KEY") or present_env?("OPENTABLE_API_KEY")
      true -> false
    end
  end

  defp resolve_provider(booking_type, opts) do
    cond do
      Keyword.get(opts, :provider_mod) ->
        Keyword.fetch!(opts, :provider_mod)

      Keyword.get(opts, :allow_test_mock, false) == true ->
        MockProvider

      Keyword.get(opts, :use_mock, false) == true and Mix.env() == :test ->
        MockProvider

      booking_type == "restaurant" ->
        OpenTable

      true ->
        Duffel
    end
  end

  defp provider_name(MockProvider), do: "mock"
  defp provider_name(Duffel), do: "duffel"
  defp provider_name(OpenTable), do: "opentable"
  defp provider_name(mod) when is_atom(mod), do: mod |> Module.split() |> List.last() |> Macro.underscore()

  defp provider_opts(params) when is_map(params) do
    []
    |> maybe_put(:allow_test_mock, truthy?(params["allow_test_mock"]))
    |> maybe_put(:use_mock, truthy?(params["use_mock"]))
  end

  defp maybe_put(opts, _k, false), do: opts
  defp maybe_put(opts, k, true), do: Keyword.put(opts, k, true)

  defp load_booking(account_id, %{"id" => id}) when is_binary(id) do
    case Repo.get(Booking, id) do
      %Booking{account_id: ^account_id} = b -> {:ok, b}
      %Booking{} -> {:error, :not_found}
      nil -> {:error, :not_found}
    end
  end

  defp load_booking(account_id, params) do
    booking_type = normalize_type(params["booking_type"] || params["type"])

    q =
      from(b in Booking,
        where: b.account_id == ^account_id,
        order_by: [desc: b.inserted_at],
        limit: 1
      )

    q =
      if booking_type do
        from(b in q, where: b.booking_type == ^booking_type)
      else
        q
      end

    case Repo.one(q) do
      %Booking{} = b -> {:ok, b}
      nil -> {:error, :not_found}
    end
  end

  defp book_params(%Booking{} = booking, params) do
    %{
      "offer_id" => params["offer_id"] || get_in(booking.details, ["results", Access.at(0), "offer_id"]),
      "provider_ref" => booking.provider_ref || params["provider_ref"],
      "booking_type" => booking.booking_type,
      "passengers" => params["passengers"] || [],
      "payments" => params["payments"] || []
    }
  end

  defp write_plan_memory(account_id, plan_id, conversation_id, %Booking{} = booking) do
    label = plan_label(booking)

    case Repo.get_by(PlanMemory, account_id: account_id, plan_id: plan_id) do
      nil ->
        %PlanMemory{}
        |> PlanMemory.changeset(%{
          account_id: account_id,
          plan_id: plan_id,
          user_role: "lead",
          related_conversation_ids: List.wrap(conversation_id) |> Enum.reject(&is_nil/1),
          status: "active",
          plan_label: label,
          place_label: get_in(booking.details, ["place"]) || get_in(booking.details, ["destination"]),
          user_commitments: [
            %{
              "type" => "booking",
              "booking_id" => booking.id,
              "confirmation_number" => booking.confirmation_number
            }
          ]
        })
        |> Repo.insert()

      %PlanMemory{} = row ->
        convs =
          Enum.uniq((row.related_conversation_ids || []) ++ List.wrap(conversation_id))
          |> Enum.reject(&is_nil/1)

        commits =
          (row.user_commitments || []) ++
            [
              %{
                "type" => "booking",
                "booking_id" => booking.id,
                "confirmation_number" => booking.confirmation_number
              }
            ]

        row
        |> PlanMemory.changeset(%{
          related_conversation_ids: convs,
          plan_label: label || row.plan_label,
          status: "active",
          user_commitments: commits
        })
        |> Repo.update()
    end
  end

  defp write_commitment(account_id, conversation_id, source_message_id, %Booking{} = booking) do
    conf = booking.confirmation_number || "pending"
    type_label = String.capitalize(booking.booking_type || "booking")
    description = "#{type_label} booked: confirmation #{conf}"

    %Commitment{}
    |> Commitment.changeset(%{
      account_id: account_id,
      description: String.slice(description, 0, 240),
      status: "open",
      source_conversation_id: conversation_id,
      source_message_id: source_message_id
    })
    |> Repo.insert()
  end

  defp plan_label(%Booking{booking_type: "flight"} = b) do
    dest = get_in(b.details, ["destination"]) || get_in(b.details, ["to"])
    if dest, do: "Flight to #{dest}", else: "Flight booking"
  end

  defp plan_label(%Booking{booking_type: "hotel"} = b) do
    place = get_in(b.details, ["place"]) || get_in(b.details, ["city"])
    if place, do: "Hotel in #{place}", else: "Hotel booking"
  end

  defp plan_label(%Booking{booking_type: "restaurant"} = b) do
    place = get_in(b.details, ["place"]) || get_in(b.details, ["query"])
    if place, do: "Reservation at #{place}", else: "Restaurant booking"
  end

  defp plan_label(%Booking{booking_type: type}), do: "#{String.capitalize(type || "booking")} booking"

  defp synthetic_conversation_id(account_id), do: account_id

  defp normalize_type(nil), do: nil

  defp normalize_type(t) when is_binary(t) do
    key = t |> String.trim() |> String.downcase()

    cond do
      key in Booking.types() -> key
      key in ["flights", "airfare", "plane"] -> "flight"
      key in ["hotels", "stay", "lodging"] -> "hotel"
      key in ["restaurants", "dinner", "table", "reservation"] -> "restaurant"
      key in ["activities", "tickets", "tour", "experience"] -> "activity"
      true -> nil
    end
  end

  defp normalize_type(_), do: nil

  defp present_env?(name) do
    case System.get_env(name) do
      key when is_binary(key) -> String.trim(key) != ""
      _ -> false
    end
  end

  defp truthy?(v) when v in [true, "true", "1", 1], do: true
  defp truthy?(_), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
