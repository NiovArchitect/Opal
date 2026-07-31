FROM elixir:1.17-otp-27-alpine AS build

RUN apk add --no-cache build-base git
WORKDIR /app

ENV MIX_ENV=prod

COPY apps/opal_core/mix.exs apps/opal_core/mix.lock* /app/apps/opal_core/
WORKDIR /app/apps/opal_core
RUN mix local.hex --force && mix local.rebar --force && mix deps.get --only prod && mix deps.compile

COPY apps/opal_core /app/apps/opal_core
COPY packages/contracts /app/packages/contracts
RUN mix compile

FROM elixir:1.17-otp-27-alpine
RUN apk add --no-cache libstdc++ openssl ncurses-libs
WORKDIR /app/apps/opal_core
ENV MIX_ENV=prod PHX_SERVER=true

COPY --from=build /app /app
COPY packages/contracts /app/packages/contracts

EXPOSE 4000
CMD ["mix", "phx.server"]
