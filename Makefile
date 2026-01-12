PYTHON := $(if $(wildcard .venv/bin/python),.venv/bin/python,python3)

.PHONY: repo-map repo-map-check

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
