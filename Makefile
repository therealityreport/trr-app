# Makefile for TRR APP
# Common development tasks for the Reality Reels application

.PHONY: help install dev dev-stable dev-local build lint test typecheck validate migrate clean

# Default target - show help
help:
	@echo "----------------------------------------------"
	@echo "TRR APP Development Commands"
	@echo "----------------------------------------------"
	@echo ""
	@echo "Setup:"
	@echo "  make install       Install all dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev           Start dev server (with Turbopack)"
	@echo "  make dev-stable    Start dev server (without Turbopack)"
	@echo "  make dev-local     Start dev with Firebase emulators"
	@echo ""
	@echo "Validation:"
	@echo "  make lint          Run ESLint"
	@echo "  make test          Run tests (Vitest)"
	@echo "  make typecheck     Run TypeScript compiler"
	@echo "  make validate      Run ALL validation (lint + typecheck + test)"
	@echo ""
	@echo "Build:"
	@echo "  make build         Production build"
	@echo "  make clean         Clean build artifacts"
	@echo ""
	@echo "Database:"
	@echo "  make migrate       Run database migrations"
	@echo ""
	@echo "----------------------------------------------"

# Installation
install:
	@echo "> Installing dependencies..."
	npm install
	npm --prefix apps/web install
	@echo "OK: Dependencies installed"

# Development servers
dev:
	@echo "> Starting development server (Turbopack)..."
	npm run dev

dev-stable:
	@echo "> Starting development server (stable, no Turbopack)..."
	npm run dev:stable

dev-local:
	@echo "> Starting development server with Firebase emulators..."
	npm run dev:local

# Build
build:
	@echo ">  Building for production..."
	@# Check for required DATABASE_URL
	@if [ -z "$$DATABASE_URL" ] && ! grep -q "^DATABASE_URL=" apps/web/.env.local 2>/dev/null; then \
		echo ""; \
		echo "ERROR: DATABASE_URL is required for Next.js build"; \
		echo ""; \
		echo "Next.js build requires DATABASE_URL to collect page data."; \
		echo ""; \
		echo "To fix this:"; \
		echo "  1. Copy template: cp apps/web/.env.example apps/web/.env.local"; \
		echo "  2. Set DATABASE_URL in apps/web/.env.local"; \
		echo "  3. Or export DATABASE_URL environment variable"; \
		echo ""; \
		echo "See SETUP.md for detailed database setup instructions."; \
		echo ""; \
		exit 1; \
	fi
	npm run web:build
	@echo "OK: Build complete"

clean:
	@echo "> Cleaning build artifacts..."
	npm run web:clean
	rm -rf apps/web/.next
	rm -rf apps/web/coverage
	@echo "OK: Clean complete"

# Validation
lint:
	@echo "> Running ESLint..."
	@cd apps/web && npm run lint
	@echo "OK: Linting complete"

test:
	@echo "> Running tests..."
	@cd apps/web && npm run test
	@echo "OK: Tests complete"

typecheck:
	@echo "> Type checking..."
	@cd apps/web && npx tsc --noEmit
	@echo "OK: Type checking complete"

# Combined validation - runs all checks
validate: lint typecheck test
	@echo "----------------------------------------------"
	@echo "OK: All validation checks passed!"
	@echo "----------------------------------------------"

# Database
migrate:
	@echo ">  Running database migrations..."
	npm --prefix apps/web run db:migrate
	@echo "OK: Migrations complete"
