PYTHON := $(if $(wildcard .venv/bin/python),.venv/bin/python,python3)
WORKSPACE_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/..)

.PHONY: dev stop logs repo-map repo-map-check

dev:
	@$(MAKE) -C $(WORKSPACE_ROOT) dev

stop:
	@$(MAKE) -C $(WORKSPACE_ROOT) stop

logs:
	@$(MAKE) -C $(WORKSPACE_ROOT) logs

repo-map:
	@$(PYTHON) scripts/generate_repo_mermaid.py

repo-map-check:
	@$(PYTHON) scripts/generate_repo_mermaid.py
	@if git diff --quiet docs/Repository/generated/; then \
		echo "Repository maps are up to date"; \
	else \
		echo "ERROR: Repository maps are out of date. Run 'make repo-map' and commit."; \
		git diff docs/Repository/generated/; \
		exit 1; \
	fi
