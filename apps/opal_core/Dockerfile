FROM elixir:1.17-otp-27-alpine

RUN apk add --no-cache build-base git inotify-tools curl
WORKDIR /app

ENV MIX_ENV=dev
ENV LANG=C.UTF-8

RUN mix local.hex --force && mix local.rebar --force

COPY apps/opal_core/mix.exs apps/opal_core/mix.lock /app/apps/opal_core/
WORKDIR /app/apps/opal_core
RUN mix deps.get && mix deps.compile

COPY apps/opal_core /app/apps/opal_core
COPY packages/contracts /app/packages/contracts

RUN mix compile

COPY apps/opal_core/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/docker-entrypoint.sh"]
