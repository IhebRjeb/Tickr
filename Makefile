# Tickr - Makefile pour développement local
# Requiert: Docker, Docker Compose, Node.js 20+

.PHONY: help setup dev stop install env db-create db-migrate db-seed db-reset test lint docker-build docker-up docker-down logs clean

# Couleurs pour output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m # No Color

##@ Aide

help: ## Affiche ce message d'aide
	@echo '$(GREEN)Tickr - Commandes Disponibles$(NC)'
	@echo ''
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup & Installation

setup: ## Setup complet du projet (à exécuter une seule fois)
	@echo "$(GREEN)🚀 Setup complet du projet Tickr...$(NC)"
	@$(MAKE) check-prerequisites
	@chmod +x scripts/*.sh 2>/dev/null || true
	@$(MAKE) env
	@$(MAKE) docker-up
	@echo "$(YELLOW)⏳ Waiting for services to be ready...$(NC)"
	@sleep 15
	@$(MAKE) install
	@$(MAKE) db-create
	@$(MAKE) db-migrate
	@$(MAKE) db-seed
	@echo "$(GREEN)✅ Setup terminé! Utilisez 'make dev' pour démarrer.$(NC)"

check-prerequisites: ## Vérifie que les outils nécessaires sont installés
	@echo "$(YELLOW)🔍 Vérification des prérequis...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)❌ Docker n'est pas installé$(NC)"; exit 1; }
	@(command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1) || { echo "$(RED)❌ Docker Compose n'est pas installé$(NC)"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js n'est pas installé$(NC)"; exit 1; }
	@echo "$(GREEN)✅ Tous les prérequis sont installés$(NC)"

install: ## Installe les dépendances (backend + frontend)
	@echo "$(GREEN)📦 Installation des dépendances...$(NC)"
	@if [ -d "backend" ]; then \
		echo "$(YELLOW)→ Backend...$(NC)"; \
		cd backend && npm install; \
	fi
	@if [ -d "frontend" ]; then \
		echo "$(YELLOW)→ Frontend...$(NC)"; \
		cd frontend && npm install; \
	fi
	@echo "$(GREEN)✅ Dépendances installées$(NC)"

env: ## Copie les fichiers .env.example vers .env.local
	@echo "$(GREEN)📝 Configuration des variables d'environnement...$(NC)"
	@if [ -d "backend" ] && [ -f "backend/.env.example" ]; then \
		cp -n backend/.env.example backend/.env.local 2>/dev/null || true; \
		echo "$(GREEN)✅ backend/.env.local créé$(NC)"; \
	fi
	@if [ -d "frontend" ] && [ -f "frontend/.env.example" ]; then \
		cp -n frontend/.env.example frontend/.env.local 2>/dev/null || true; \
		echo "$(GREEN)✅ frontend/.env.local créé$(NC)"; \
	fi

##@ Développement

dev: ## Lance l'environnement de développement complet
	@echo "$(GREEN)🚀 Démarrage de l'environnement de développement...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✅ Services démarrés!$(NC)"
	@echo ""
	@echo "$(YELLOW)📍 URLs d'accès:$(NC)"
	@echo "   Frontend:  http://localhost:3001"
	@echo "   Backend:   http://localhost:3000"
	@echo "   API Docs:  http://localhost:3000/api/docs"
	@echo "   pgAdmin:   http://localhost:5050"
	@echo "   Maildev:   http://localhost:1080"
	@echo ""
	@echo "$(YELLOW)💡 Commandes utiles:$(NC)"
	@echo "   make logs      - Voir les logs en temps réel"
	@echo "   make stop      - Arrêter les services"
	@echo "   make db-reset  - Reset la base de données"

dev-backend: ## Lance uniquement backend + DB + Redis
	@echo "$(GREEN)🚀 Démarrage backend + services...$(NC)"
	@docker-compose up -d postgres redis backend
	@echo "$(GREEN)✅ Backend démarré sur http://localhost:3000$(NC)"

dev-frontend: ## Lance uniquement frontend
	@echo "$(GREEN)🚀 Démarrage frontend...$(NC)"
	@docker-compose up -d frontend
	@echo "$(GREEN)✅ Frontend démarré sur http://localhost:3001$(NC)"

stop: ## Arrête tous les services
	@echo "$(YELLOW)🛑 Arrêt des services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ Services arrêtés$(NC)"

restart: stop dev ## Redémarre tous les services

##@ Base de Données

db-create: ## Crée la base de données
	@echo "$(GREEN)🗄️ Création de la base de données...$(NC)"
	@docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE tickr;" 2>/dev/null || echo "$(YELLOW)⚠️ Base de données déjà existante$(NC)"
	@echo "$(GREEN)✅ Base de données créée$(NC)"

db-migrate: ## Exécute les migrations
	@echo "$(GREEN)🔄 Exécution des migrations...$(NC)"
	@if [ -d "backend" ]; then \
		cd backend && npm run migration:run || echo "$(YELLOW)⚠️ No migrations to run or migration failed$(NC)"; \
	fi
	@echo "$(GREEN)✅ Migrations terminées$(NC)"

db-seed: ## Seed avec données de test
	@echo "$(GREEN)🌱 Seed de la base de données...$(NC)"
	@if [ -d "backend" ]; then \
		cd backend && npm run seed 2>/dev/null || echo "$(YELLOW)⚠️ Seed script not yet implemented$(NC)"; \
	fi
	@echo "$(GREEN)✅ Seed terminé$(NC)"

db-reset: ## Reset complet de la DB (drop + create + migrate + seed)
	@echo "$(RED)⚠️  ATTENTION: Ceci va supprimer toutes les données!$(NC)"
	@read -p "Continuer? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(MAKE) db-drop; \
		$(MAKE) db-create; \
		$(MAKE) db-migrate; \
		$(MAKE) db-seed; \
		echo "$(GREEN)✅ Base de données réinitialisée$(NC)"; \
	fi

db-drop: ## Supprime la base de données
	@echo "$(RED)🗑️ Suppression de la base de données...$(NC)"
	@docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS tickr;" 2>/dev/null || true
	@echo "$(GREEN)✅ Base de données supprimée$(NC)"

db-studio: ## Ouvre pgAdmin pour explorer la DB
	@echo "$(GREEN)🖥️ Ouverture de pgAdmin...$(NC)"
	@open http://localhost:5050 2>/dev/null || xdg-open http://localhost:5050 2>/dev/null || echo "$(YELLOW)Ouvrez http://localhost:5050 dans votre navigateur$(NC)"

shell-db: ## Connexion psql à la base de données
	@docker-compose exec postgres psql -U postgres -d tickr

##@ Tests

test: ## Lance tous les tests
	@echo "$(GREEN)🧪 Exécution des tests...$(NC)"
	@$(MAKE) test-backend
	@$(MAKE) test-frontend

test-backend: ## Tests backend uniquement
	@echo "$(GREEN)🧪 Tests backend...$(NC)"
	@if [ -d "backend" ] && [ -f "backend/package.json" ]; then \
		cd backend && npm run test; \
	else \
		echo "$(YELLOW)⚠️ Backend not found or not initialized, skipping tests$(NC)"; \
	fi

test-frontend: ## Tests frontend uniquement
	@echo "$(GREEN)🧪 Tests frontend...$(NC)"
	@if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then \
		cd frontend && npm run test; \
	else \
		echo "$(YELLOW)⚠️ Frontend not found or not initialized, skipping tests$(NC)"; \
	fi

test-unit: ## Tests unitaires uniquement
	@echo "$(GREEN)🧪 Tests unitaires...$(NC)"
	@if [ -d "backend" ]; then \
		cd backend && npm run test:unit; \
	fi

test-e2e: ## Tests E2E uniquement
	@echo "$(GREEN)🧪 Tests E2E...$(NC)"
	@if [ -d "backend" ]; then \
		cd backend && npm run test:e2e; \
	fi

test-watch: ## Tests en mode watch
	@if [ -d "backend" ]; then \
		cd backend && npm run test:watch; \
	fi

test-cov: ## Tests avec coverage
	@echo "$(GREEN)📊 Tests avec coverage...$(NC)"
	@if [ -d "backend" ]; then \
		cd backend && npm run test:cov; \
	fi

##@ Qualité du Code

lint: ## Lint backend + frontend
	@echo "$(GREEN)🔍 Linting...$(NC)"
	@if [ -d "backend" ]; then \
		cd backend && npm run lint; \
	fi
	@if [ -d "frontend" ]; then \
		cd frontend && npm run lint; \
	fi

lint-fix: ## Fix automatique des problèmes de lint
	@echo "$(GREEN)🔧 Auto-fix linting...$(NC)"
	@if [ -d "backend" ]; then \
		cd backend && npm run lint:fix; \
	fi
	@if [ -d "frontend" ]; then \
		cd frontend && npm run lint:fix; \
	fi

format: ## Format le code avec Prettier
	@echo "$(GREEN)💅 Formatage du code...$(NC)"
	@if [ -d "backend" ]; then \
		cd backend && npm run format; \
	fi
	@if [ -d "frontend" ]; then \
		cd frontend && npm run format; \
	fi

type-check: ## Vérification TypeScript
	@echo "$(GREEN)📝 Vérification TypeScript...$(NC)"
	@if [ -d "backend" ]; then \
		cd backend && npm run type-check; \
	fi
	@if [ -d "frontend" ]; then \
		cd frontend && npm run type-check; \
	fi

##@ Docker

docker-build: ## Build les images Docker
	@echo "$(GREEN)🐳 Build des images Docker...$(NC)"
	@docker-compose build --parallel
	@echo "$(GREEN)✅ Images construites$(NC)"

docker-up: ## Lance les containers Docker
	@echo "$(GREEN)🐳 Démarrage des containers...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✅ Containers démarrés$(NC)"

docker-down: ## Arrête les containers Docker
	@echo "$(YELLOW)🐳 Arrêt des containers...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ Containers arrêtés$(NC)"

docker-logs: logs ## Alias pour 'logs'

docker-clean: ## Nettoie les images et volumes Docker
	@echo "$(RED)🧹 Nettoyage Docker...$(NC)"
	@docker-compose down -v --rmi local
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

docker-prune: ## Nettoie tous les containers/images inutilisés
	@echo "$(RED)🧹 Nettoyage profond Docker...$(NC)"
	@docker system prune -af --volumes
	@echo "$(GREEN)✅ Nettoyage profond terminé$(NC)"

##@ Utilitaires

logs: ## Affiche les logs en temps réel
	@docker-compose logs -f

logs-backend: ## Logs backend uniquement
	@docker-compose logs -f backend

logs-frontend: ## Logs frontend uniquement
	@docker-compose logs -f frontend

logs-db: ## Logs PostgreSQL uniquement
	@docker-compose logs -f postgres

shell-backend: ## Shell dans le container backend
	@docker-compose exec backend sh

shell-frontend: ## Shell dans le container frontend
	@docker-compose exec frontend sh

clean: ## Nettoie node_modules, dist, cache
	@echo "$(YELLOW)🧹 Nettoyage des fichiers générés...$(NC)"
	@find . -name "node_modules" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	@find . -name "dist" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	@find . -name ".cache" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	@find . -name "coverage" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

status: ## Affiche le statut des services
	@echo "$(GREEN)📊 Statut des services:$(NC)"
	@docker-compose ps

health: ## Vérifie la santé des services
	@echo "$(GREEN)🏥 Health check...$(NC)"
	@curl -s http://localhost:3000/health 2>/dev/null | jq . && echo "$(GREEN)✅ Backend OK$(NC)" || echo "$(RED)❌ Backend non disponible$(NC)"
	@curl -s http://localhost:3001 >/dev/null 2>&1 && echo "$(GREEN)✅ Frontend OK$(NC)" || echo "$(RED)❌ Frontend non disponible$(NC)"
	@docker-compose exec -T redis redis-cli -a tickr123 ping >/dev/null 2>&1 && echo "$(GREEN)✅ Redis OK$(NC)" || echo "$(RED)❌ Redis non disponible$(NC)"
	@docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1 && echo "$(GREEN)✅ PostgreSQL OK$(NC)" || echo "$(RED)❌ PostgreSQL non disponible$(NC)"

##@ Production

build-prod: ## Build pour production
	@echo "$(GREEN)🏗️ Build production...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
	@echo "$(GREEN)✅ Build production terminé$(NC)"

deploy-staging: ## Deploy vers staging (simulation)
	@echo "$(YELLOW)🚀 Déploiement staging (simulation locale)...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✅ Staging déployé localement$(NC)"

##@ Info

version: ## Affiche les versions
	@echo "$(GREEN)📌 Versions:$(NC)"
	@echo "Node:    $$(node --version)"
	@echo "npm:     $$(npm --version)"
	@echo "Docker:  $$(docker --version)"
	@echo "Compose: $$(docker-compose --version)"

info: ## Affiche les informations du projet
	@echo "$(GREEN)📋 Informations Tickr:$(NC)"
	@echo "Project:  Tickr - Plateforme de Billetterie"
	@echo "Version:  1.0.0"
	@echo "Stack:    Next.js + NestJS + PostgreSQL + Redis"
	@echo "Docs:     ./docs/README.md"

# Par défaut, afficher l'aide
.DEFAULT_GOAL := help
