# =============================================================================
# BIBI Cars — Make shortcuts
# =============================================================================
# `make help` shows the targets. All real logic is in scripts/*.sh
# =============================================================================
.DEFAULT_GOAL := help
SHELL := /bin/bash

ROOT := $(shell pwd)

.PHONY: help quickstart setup install dev seed health restart \
        backend frontend logs lint clean prepare push status \
        backend-restart frontend-restart

help: ## Show this help
	@awk 'BEGIN{FS=":.*##";printf "\nUsage: make <target>\n\nTargets:\n"} \
	/^[a-zA-Z_-]+:.*?##/ {printf "  \033[36m%-18s\033[0m %s\n",$$1,$$2}' $(MAKEFILE_LIST)

quickstart: ## Full bootstrap (clone-friendly): install + seed + run + smoke
	bash scripts/quickstart.sh

setup: ## Install dependencies only (no service restart)
	bash scripts/setup.sh

install: setup ## Alias for `setup`

dev: ## Run backend + frontend in dev mode (foreground, no supervisor)
	bash scripts/dev.sh

seed: ## Wipe & reseed staff from backend/.env
	bash scripts/seed.sh

seed-force: ## Reseed without confirmation prompt
	bash scripts/seed.sh --force

health: ## Smoke-test backend + frontend endpoints
	bash scripts/health.sh

restart: ## Restart backend + frontend via supervisor
	sudo supervisorctl restart backend frontend

backend-restart: ## Restart only backend
	sudo supervisorctl restart backend

frontend-restart: ## Restart only frontend
	sudo supervisorctl restart frontend

status: ## Service status
	sudo supervisorctl status

logs: ## Tail combined backend + frontend stderr logs
	tail -n 80 /var/log/supervisor/backend.err.log /var/log/supervisor/frontend.err.log

lint: ## Lint backend (ruff) + frontend (eslint)
	@cd backend && python3 -m ruff check . || true
	@cd frontend && yarn lint || true

clean: ## Remove __pycache__ / *.pyc / build artefacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name '*.pyc' -delete 2>/dev/null || true
	rm -rf frontend/build frontend/dist 2>/dev/null || true

prepare: ## Pre-commit checks (no secrets, syntax, gitignore)
	bash scripts/git_prepare.sh

push: ## Quick add+commit+push (set MSG="..." and REMOTE=git@... if first time)
	@if [ -n "$$REMOTE" ]; then bash scripts/git_init_and_push.sh "$$REMOTE" "$${MSG:-update}"; \
	else git add -A && git commit -m "$${MSG:-update}" && git push; fi
