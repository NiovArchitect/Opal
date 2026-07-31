.PHONY: setup start stop reset migrate seed test test-elixir test-python test-contracts format lint docker-build

ROOT := $(shell pwd)
CORE := $(ROOT)/apps/opal_core
AI := $(ROOT)/services/opal_ai
COMPOSE := docker compose -f infra/local/docker-compose.yml

setup:
	@echo "==> Python setup"
	cd $(AI) && python3 -m venv .venv && . .venv/bin/activate && pip install -U pip && pip install -e ".[dev]"
	@echo "==> Elixir setup"
	cd $(CORE) && mix deps.get
	@echo "==> Ensure postgres (docker)"
	$(COMPOSE) up -d postgres
	@echo "==> Wait for postgres"
	@sleep 3
	cd $(CORE) && mix ecto.create || true
	cd $(CORE) && mix ecto.migrate
	cd $(CORE) && mix run priv/repo/seeds.exs
	@echo "Setup complete."

start:
	$(COMPOSE) up -d postgres
	@echo "Start opal_ai: cd services/opal_ai && . .venv/bin/activate && uvicorn opal_ai.main:app --port 8000"
	@echo "Start opal_core: cd apps/opal_core && mix phx.server"

stop:
	$(COMPOSE) down

reset:
	$(COMPOSE) down -v
	cd $(CORE) && mix ecto.drop || true
	cd $(CORE) && mix ecto.create && mix ecto.migrate && mix run priv/repo/seeds.exs

migrate:
	cd $(CORE) && mix ecto.migrate

seed:
	cd $(CORE) && mix run priv/repo/seeds.exs

test: test-contracts test-python test-elixir

test-contracts:
	cd $(AI) && . .venv/bin/activate && pytest tests/test_worker.py::test_examples_validate_against_schemas -q

test-python:
	cd $(AI) && . .venv/bin/activate && pytest -q

test-elixir:
	cd $(CORE) && mix test

format:
	cd $(CORE) && mix format
	cd $(AI) && . .venv/bin/activate && ruff format .

lint:
	cd $(CORE) && mix format --check-formatted
	cd $(CORE) && mix compile --warnings-as-errors
	cd $(CORE) && mix credo --strict || true
	cd $(AI) && . .venv/bin/activate && ruff check .
	cd $(AI) && . .venv/bin/activate && mypy opal_ai

docker-build:
	$(COMPOSE) build
