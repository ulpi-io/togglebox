# ============================================================================
# ToggleBox Docker Development Environment
# ============================================================================
# Makefile for managing Docker containers
# ============================================================================

.PHONY: dev prod down restart build clean rebuild logs logs-api logs-admin logs-db \
        status reset-db init-db shell-api shell-admin help

.DEFAULT_GOAL := help

# Paths
COMPOSE_DEV := -f docker-compose.dev.yml
COMPOSE_PROD := -f docker-compose.prod.yml

# ---------------------------------------------------------------------------
# Service Management
# ---------------------------------------------------------------------------

dev: ## Start development environment with hot reload
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  Starting ToggleBox Development Environment"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@if [ ! -f apps/api/.env ]; then \
		echo "Creating apps/api/.env from .env.example..."; \
		cp apps/api/.env.example apps/api/.env; \
	fi

	@if [ ! -f apps/admin/.env.local ]; then \
		echo "Creating apps/admin/.env.local from .env.example..."; \
		cp apps/admin/.env.example apps/admin/.env.local; \
	fi
	docker compose $(COMPOSE_DEV) up -d
	@echo ""
	@$(MAKE) -s status-dev

prod: ## Start production environment
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  Starting ToggleBox Production Environment"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	docker compose $(COMPOSE_PROD) up -d
	@echo ""
	@$(MAKE) -s status-prod

down: ## Stop all services (development)
	@echo "Stopping development services..."
	docker compose $(COMPOSE_DEV) down

down-prod: ## Stop all services (production)
	@echo "Stopping production services..."
	docker compose $(COMPOSE_PROD) down

restart: ## Restart all development services
	@echo "Restarting development services..."
	docker compose $(COMPOSE_DEV) restart

restart-prod: ## Restart all production services
	@echo "Restarting production services..."
	docker compose $(COMPOSE_PROD) restart

build: ## Rebuild development containers (no cache)
	@echo "Rebuilding development containers..."
	docker compose $(COMPOSE_DEV) build --no-cache

build-prod: ## Rebuild production containers (no cache)
	@echo "Rebuilding production containers..."
	docker compose $(COMPOSE_PROD) build --no-cache

rebuild: ## Clean volumes, rebuild containers, and start fresh (development)
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  Rebuilding from scratch..."
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "1. Stopping and removing containers and volumes..."
	docker compose $(COMPOSE_DEV) down -v
	@echo "2. Removing old named volumes if they exist..."
	-docker volume rm togglebox-api-node-modules 2>/dev/null || true
	-docker volume rm togglebox-api-packages-node-modules 2>/dev/null || true
	-docker volume rm togglebox-admin-node-modules 2>/dev/null || true
	-docker volume rm togglebox-admin-packages-node-modules 2>/dev/null || true
	@echo "3. Rebuilding containers without cache..."
	docker compose $(COMPOSE_DEV) build --no-cache
	@echo "4. Starting services..."
	docker compose $(COMPOSE_DEV) up -d
	@echo ""
	@echo "✅ Rebuild complete!"
	@echo ""
	@$(MAKE) -s status-dev

# ---------------------------------------------------------------------------
# Clean Up
# ---------------------------------------------------------------------------

clean: ## Stop services and remove volumes (development)
	@echo "Cleaning up development environment..."
	docker compose $(COMPOSE_DEV) down -v
	@echo "✅ Development environment cleaned!"

clean-prod: ## Stop services and remove volumes (production)
	@echo "Cleaning up production environment..."
	docker compose $(COMPOSE_PROD) down -v
	@echo "✅ Production environment cleaned!"

# ---------------------------------------------------------------------------
# Logs
# ---------------------------------------------------------------------------

logs: ## View logs for all services (development)
	docker compose $(COMPOSE_DEV) logs -f

logs-api: ## View API logs only (development)
	docker compose $(COMPOSE_DEV) logs -f api

logs-admin: ## View Admin logs only (development)
	docker compose $(COMPOSE_DEV) logs -f admin

logs-db: ## View DynamoDB logs (development)
	docker compose $(COMPOSE_DEV) logs -f dynamodb-local

logs-init: ## View DynamoDB init logs (development)
	docker compose $(COMPOSE_DEV) logs dynamodb-init

# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

status: status-dev ## Show development service status (default)

status-dev: ## Show development service status
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  ToggleBox Development Status"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker compose $(COMPOSE_DEV) ps
	@echo ""
	@echo "Access Points:"
	@echo "  - API:             http://localhost:3000"
	@echo "  - Admin:           http://localhost:3001"
	@echo "  - DynamoDB:        http://localhost:8000"
	@echo "  - DynamoDB Admin:  http://localhost:8001"
	@echo ""
	@echo "Commands:"
	@echo "  - make logs        View all logs"
	@echo "  - make logs-api    View API logs"
	@echo "  - make logs-admin  View Admin logs"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

status-prod: ## Show production service status
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  ToggleBox Production Status"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker compose $(COMPOSE_PROD) ps
	@echo ""
	@echo "Access Points:"
	@echo "  - API:             http://localhost:3000"
	@echo "  - Admin:           http://localhost:3001"
	@echo "  - DynamoDB:        http://localhost:8000"
	@echo "  - DynamoDB Admin:  http://localhost:8001"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

reset-db: ## Reset DynamoDB database (delete all data)
	@echo "⚠️  WARNING: This will delete all data!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read dummy
	@echo "Resetting database..."
	docker compose $(COMPOSE_DEV) down -v
	docker compose $(COMPOSE_DEV) up -d
	@echo "✅ Database reset complete!"

init-db: ## Reinitialize DynamoDB tables
	@echo "Reinitializing DynamoDB tables..."
	docker compose $(COMPOSE_DEV) up dynamodb-init
	@echo "✅ Tables initialized!"

# ---------------------------------------------------------------------------
# Shell Access
# ---------------------------------------------------------------------------

shell-api: ## Open shell in API container (development)
	docker compose $(COMPOSE_DEV) exec api sh

shell-admin: ## Open shell in Admin container (development)
	docker compose $(COMPOSE_DEV) exec admin sh

shell-db: ## Open shell in DynamoDB container (development)
	docker compose $(COMPOSE_DEV) exec dynamodb-local sh

# ---------------------------------------------------------------------------
# Testing
# ---------------------------------------------------------------------------

test: ## Run tests in API container
	@echo "Running tests..."
	docker compose $(COMPOSE_DEV) exec api sh -c "cd /app/apps/api && pnpm test"

test-watch: ## Run tests in watch mode
	@echo "Running tests in watch mode..."
	docker compose $(COMPOSE_DEV) exec api sh -c "cd /app/apps/api && pnpm test:watch"

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------

help: ## Show this help message
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  ToggleBox Docker Development"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
