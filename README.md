# 🎫 Tickr - Plateforme de Billetterie en Ligne

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/IhebRjeb/Tickr)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20NestJS%20%7C%20PostgreSQL-orange.svg)](docs/02-technique/01-stack-technique.md)

> Plateforme web de billetterie en ligne pour le marché tunisien, permettant aux organisateurs d'événements de créer, gérer et vendre des billets digitaux avec paiement en ligne et entrée par QR code (check-in).

---

## 🚀 Vue d'Ensemble

**Tickr** est une solution complète de gestion de billetterie développée avec une architecture **Monolithe Modulaire Hexagonal** avec migration progressive vers microservices. Le projet cible spécifiquement le marché tunisien avec support des paiements locaux (Clictopay/Edinar) et internationaux (Stripe).

### 🎯 Proposition de Valeur

**Pour Organisateurs :**
- ✅ Création d'événement en moins de 5 minutes
- ✅ Paiement en ligne sécurisé (cartes locales + internationales)
- ✅ Gestion des billets en temps réel
- ✅ Statistiques de ventes instantanées
- ✅ Check-in par QR code à l'entrée

**Pour Participants :**
- ✅ Achat de billets mobile-first
- ✅ Paiement par carte locale ou internationale
- ✅ Réception instantanée du QR code (email/SMS)
- ✅ Notifications et rappels automatiques

---

## 📂 Structure du Repository

Ce repository est organisé comme un **monorepo** contenant tous les composants du projet :

```
Tickr/
├── docs/                          # 📚 Documentation complète
│   ├── 01-fonctionnel/            # Spécifications métier
│   ├── 02-technique/              # Stack & API
│   ├── 03-architecture/           # Architecture hexagonale
│   ├── 04-infrastructure/         # AWS & déploiement
│   ├── PROJECT_STATUS.md          # Status tracking
│   └── COMMISSION_RATE_UPDATE.md  # Commission rate changes
│
├── backend/                       # ⚙️ API NestJS
│   ├── src/
│   │   ├── modules/
│   │   │   ├── events/           # Module Événements ✅
│   │   │   ├── users/            # Module Utilisateurs ✅
│   │   │   ├── tickets/          # Module Billets ✅
│   │   │   ├── payments/         # Module Paiements ✅
│   │   │   ├── notifications/    # Module Notifications (planned)
│   │   │   └── analytics/        # Module Analytics (planned)
│   │   ├── shared/               # Code partagé
│   │   └── config/               # Configuration
│   ├── test/                     # Tests (1805+ passing)
│   └── migrations/               # Migrations DB
│
├── frontend/                      # 🎨 Application NextJs
│   ├── src/
│   │   ├── app/                  # Routes & pages
│   │   ├── components/           # Composants UI
│   │   ├── lib/                  # Hooks & utilities
│   │   └── types/                # TypeScript types
│   └── public/
│
├── infrastructure/                # 🏗️ Infrastructure as Code
│   ├── monitoring/               # Monitoring config
│   └── nginx/                    # Nginx config
│
├── scripts/                       # 🛠️ Scripts utilitaires
│   ├── localstack-init.sh        # Setup local cloud stack
│   └── init-db.sql               # Init database
│
├── AGENTS.md                      # 🤖 AI development guide
└── README.md                      # 📖 Ce fichier
```

---

## 🛠️ Stack Technique

### Backend
- **Framework :** NestJS 10+ (Node.js 20 LTS)
- **Langage :** TypeScript 5.3+
- **Base de données :** PostgreSQL 15.4
- **Cache :** Redis 7.x
- **ORM :** TypeORM
- **Architecture :** Hexagonale (Ports & Adapters)

### Frontend
- **Framework :** Next.js 16 (App Router)
- **UI Library :** React 19
- **Langage :** TypeScript 5.9+
- **UI/Styling :** TailwindCSS 4 + Headless UI
- **State Management :** React Query + Zustand
- **Forms :** React Hook Form + Zod
- **Testing :** Vitest + Testing Library + Playwright

### Infrastructure (AWS)
- **Compute :** ECS Fargate
- **Database :** RDS PostgreSQL
- **Cache :** ElastiCache Redis
- **Storage :** S3 (images)
- **CDN :** CloudFront (V2)
- **Monitoring :** CloudWatch + X-Ray
- **IaC :** Terraform

### Paiements
- **Tunisie :** Clictopay / Edinar
- **International :** Stripe

### Notifications
- **Email :** Amazon SES
- **SMS :** Amazon SNS / Twilio

---

## 📊 Architecture

### 6 Modules Bounded Contexts

Le backend est structuré en **6 modules isolés** communiquant uniquement via **événements** :

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  USERS   │  │  EVENTS  │  │ TICKETS  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │
     └─────────────┼──────────────┘
                   │
            ┌──────▼──────┐
            │ EVENT BUS   │
            └──────┬──────┘
                   │
     ┌─────────────┼──────────────┐
     │             │              │
┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐
│ PAYMENTS │  │  NOTIFS  │  │ANALYTICS │
└──────────┘  └──────────┘  └──────────┘
```

| Module | Responsabilité |
|--------|----------------|
| **Users** | Authentification, profils, autorisation |
| **Events** | Création/gestion événements, types de billets |
| **Tickets** | Génération billets, QR codes, check-in |
| **Payments** | Commandes, paiements, remboursements |
| **Notifications** | Emails, SMS, notifications push |
| **Analytics** | Statistiques, métriques, rapports |

**📖 Plus de détails :** [Structure Modules](docs/03-architecture/02-structure-modules.md)

---

## 🚦 Démarrage Rapide

### Prérequis

```bash
# Vérifier les versions
node --version    # >= 20.0.0
docker --version  # >= 24.0.0
make --version    # GNU Make 3.81+
```

### Installation Rapide (Recommandé)

```bash
# 1. Cloner le repository
git clone https://github.com/IhebRjeb/Tickr.git
cd Tickr

# 2. Setup complet en une commande
make setup

# 3. Lancer l'environnement de développement
make dev
```

**C'est tout ! 🎉** L'application est maintenant disponible.

### Commandes Make Disponibles

```bash
# 🚀 Développement
make dev              # Lance tous les services (DB, Backend, Frontend)
make dev-backend      # Lance uniquement backend + DB
make dev-frontend     # Lance uniquement frontend
make stop             # Arrête tous les services

# 📦 Installation & Setup
make setup            # Setup initial complet (install + env + db)
make install          # Installe les dépendances (backend + frontend)
make env              # Copie les fichiers .env.example

# 🗄️ Base de données
make db-create        # Crée la base de données
make db-migrate       # Exécute les migrations
make db-seed          # Seed avec données de test
make db-reset         # Reset complet (drop + create + migrate + seed)
make db-studio        # Ouvre l'interface DB (Prisma Studio / pgAdmin)

# 🧪 Tests
make test             # Lance tous les tests
make test-unit        # Tests unitaires uniquement
make test-e2e         # Tests E2E uniquement
make test-watch       # Tests en mode watch
make test-cov         # Tests avec coverage

# 🧹 Qualité du code
make lint             # Lint backend + frontend
make lint-fix         # Fix automatique des problèmes
make format           # Format le code (Prettier)
make type-check       # Vérification TypeScript

# 🐳 Docker
make docker-build     # Build les images Docker
make docker-up        # Lance les containers
make docker-down      # Arrête les containers
make docker-logs      # Affiche les logs
make docker-clean     # Nettoie images et volumes

# 🔧 Utilitaires
make logs             # Voir les logs en temps réel
make shell-backend    # Shell dans le container backend
make shell-db         # Connexion psql à la DB
make clean            # Nettoie node_modules, dist, cache
make help             # Affiche toutes les commandes
```

### Structure d'Environnement Moderne

```
Tickr/
├── Makefile                       # 🎯 Orchestration complète
├── docker-compose.yml             # 🐳 Services locaux
├── docker-compose.dev.yml         # 🔧 Override pour dev
├── docker-compose.prod.yml        # 🚀 Override pour prod
│
├── .github/
│   └── workflows/
│       ├── ci.yml                 # ✅ CI Pipeline
│       ├── cd-staging.yml         # 🔄 Deploy Staging
│       └── cd-production.yml      # 🚀 Deploy Production
│
├── backend/
│   ├── .env.example               # Template configuration
│   ├── .env.local                 # Config locale (git-ignored)
│   ├── Dockerfile                 # Multi-stage build
│   └── Dockerfile.dev             # Dev avec hot-reload
│
└── frontend/
    ├── .env.example
    ├── .env.local
    ├── Dockerfile
    └── Dockerfile.dev
```

### Configuration Docker Compose Optimisée

```yaml
# docker-compose.yml - Services de base
services:
  postgres:
    image: postgres:15.4-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
  
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
      target: development
    volumes:
      - ./backend:/app
      - /app/node_modules
      - backend_cache:/app/.cache
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/tickr
      REDIS_URL: redis://redis:6379
  
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - frontend_cache:/app/.next
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000

volumes:
  postgres_data:
  redis_data:
  backend_cache:
  frontend_cache:
```

### Variables d'Environnement

Les fichiers `.env.example` sont automatiquement copiés lors du `make setup`:

```bash
# backend/.env.local
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tickr
DATABASE_SCHEMA=public

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL=300

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# AWS (local development avec LocalStack)
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT=http://localhost:4566
S3_BUCKET=tickr-dev

# Payments (Sandbox)
STRIPE_SECRET_KEY=sk_test_...
CLICTOPAY_API_KEY=test_...

# Notifications
SES_FROM_EMAIL=dev@tickr.local
SMS_PROVIDER=mock

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

### Accès aux Services

| Service | URL | Credentials |
|---------|-----|-------------|
| 🎨 **Frontend (Next.js)** | http://localhost:3001 | - |
| ⚙️ **Backend API** | http://localhost:3000 | - |
| 📖 **API Docs** | http://localhost:3000/api/docs | - |
| 📊 **Health Check** | http://localhost:3000/health | - |
| 🗄️ **PostgreSQL** | localhost:5432 | `postgres` / `postgres` |
| ⚡ **Redis** | localhost:6379 | - |
| 📧 **Maildev** (emails locaux) | http://localhost:1080 | - |
| 🗃️ **pgAdmin** | http://localhost:5050 | `admin@tickr.local` / `admin` |
| ☁️ **LocalStack** (AWS local) | http://localhost:4566 | - |

### Mode Watch & Hot Reload

Tous les services supportent le **hot-reload automatique** :

- **Backend :** Nodemon détecte les changements et redémarre
- **Frontend :** Next.js Fast Refresh (HMR)
- **Database :** Migrations automatiques avec watch mode

```bash
# Développement avec logs en temps réel
make dev

# Dans un autre terminal, voir les logs
make logs

# Logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 📚 Documentation

La documentation complète est disponible dans le dossier [`docs/`](docs/README.md).

### 🎯 Parcours Recommandé (1h30)

**Lecture essentielle avant de coder :**

1. **[Vue d'Ensemble Fonctionnelle](docs/01-fonctionnel/01-vue-ensemble.md)** (15 min)  
   → Comprendre les acteurs et workflows métier

2. **[Stack Technique](docs/02-technique/01-stack-technique.md)** (10 min)  
   → Valider les choix technologiques

3. **[Principes Hexagonaux](docs/03-architecture/01-principes-hexagonaux.md)** (20 min)  
   → Maîtriser les fondamentaux de l'architecture

4. **[Structure Modules](docs/03-architecture/02-structure-modules.md)** (30 min)  
   → Comprendre l'organisation des 6 modules

5. **[Database Schema](docs/02-technique/03-database-schema.md)** (20 min)  
   → Étudier la structure de la base de données

### 📖 Documentation Complète

| Catégorie | Documents | Description |
|-----------|-----------|-------------|
| **01-Fonctionnel** | [📁](docs/01-fonctionnel/) | Vision produit, user stories, règles métier |
| **02-Technique** | [📁](docs/02-technique/) | Stack, API, database, modèle économique |
| **03-Architecture** | [📁](docs/03-architecture/) | Hexagonal, modules, event-driven, microservices |
| **04-Infrastructure** | [📁](docs/04-infrastructure/) | AWS, Terraform, CI/CD, monitoring |
| **05-Git Workflow** | [📁](docs/05-git-workflow/) | Branching strategy, CI/CD, architecture tests |

**📖 Index complet :** [Documentation README](docs/README.md)

### 🏛️ Architecture Quick Reference

For developers starting with the project, check these architecture guides:

- **[Architecture Quick Reference](docs/03-architecture/06-architecture-quick-ref.md)** - Commands, common violations & fixes
- **[Architecture Tests Verification](docs/03-architecture/07-tests-verification.md)** - CI/CD integration details
- **[CI Integration Complete](docs/03-architecture/08-ci-integration-complete.md)** - Full integration summary
- **[Backend Setup Guide](docs/03-architecture/09-backend-setup-guide.md)** - NestJS initialization guide

---

## 🧪 Tests

```bash
# Backend - Tests unitaires
cd backend
npm run test

# Backend - Tests E2E
npm run test:e2e

# Backend - Coverage
npm run test:cov

# Frontend - Tests
cd frontend
npm run test
```

**Objectifs de couverture :**
- Unitaires : > 80%
- Intégration : > 70%
- E2E : Workflows critiques couverts

---

## 🚀 Déploiement

### Environnements

```yaml
Development:
  URL: http://localhost:3001
  Backend: http://localhost:3000
  Database: Docker local

Staging:
  URL: https://staging.tickr.tn
  Backend: https://api-staging.tickr.tn
  Database: RDS (db.t3.small)

Production:
  URL: https://tickr.tn
  Backend: https://api.tickr.tn
  Database: RDS (db.t3.medium, Multi-AZ)
```

### CI/CD Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ feature/ │  │ develop  │  │   main   │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
└───────┼─────────────┼─────────────┼────────────────────────┘
        │             │             │
        ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │   CI    │  │CI + Deploy│ │CI + Deploy│
   │ Workflow│  │  Staging  │ │Production │
   └─────────┘  └──────────┘  └──────────┘
```

#### 🔄 Workflow: CI (Pull Requests & Feature Branches)

**Trigger :** Push sur `feature/*` ou PR vers `develop`/`main`

```yaml
Jobs:
  1. 📝 Lint & Format Check
     - ESLint (backend + frontend)
     - Prettier check
     - TypeScript type check
     
  2. 🧪 Tests
     - Unit tests (Backend)
     - Unit tests (Frontend)
     - Integration tests
     - E2E tests (Playwright)
     - Coverage report → Codecov
     
  3. 🏗️ Build
     - Build backend (TypeScript)
     - Build frontend (Next.js)
     - Docker image build (cache)
     
  4. 🔒 Security Scan
     - npm audit
     - Snyk vulnerability scan
     - SAST (Static Analysis)
     - Dependency check
     
  5. 📊 Quality Gates
     - Coverage > 80%
     - No critical vulnerabilities
     - Build successful
     - All tests passing

Duration: ~8-12 minutes
```

#### 🚀 Workflow: CD Staging (Develop Branch)

**Trigger :** Push sur `develop`

```yaml
Jobs:
  1-5. [Same as CI Workflow]
  
  6. 🐳 Build & Push
     - Build Docker images (backend + frontend)
     - Tag: ${GITHUB_SHA::7}
     - Push to AWS ECR
     
  7. 📦 Deploy to Staging
     - Update ECS task definition
     - Deploy to staging cluster
     - Health check validation
     
  8. 🧪 Smoke Tests
     - API health endpoints
     - Database connectivity
     - Redis connectivity
     - S3 access
     
  9. 📢 Notifications
     - Slack: deployment status
     - Email: team notification
     - GitHub: deployment tag

Environment: staging.tickr.tn
Duration: ~15-20 minutes
Auto-rollback: On health check failure
```

#### 🎯 Workflow: CD Production (Main Branch)

**Trigger :** Push sur `main` (après merge de PR)

```yaml
Jobs:
  1-5. [Same as CI Workflow]
  
  6. 🏷️ Semantic Versioning
     - Generate version from commits
     - Create Git tag
     - Update CHANGELOG.md
     
  7. 🐳 Build & Push
     - Build Docker images
     - Tag: v${VERSION} + latest
     - Push to AWS ECR
     - Sign images (Cosign)
     
  8. ⏸️ Manual Approval Gate
     - Required reviewers: 1
     - Timeout: 24 hours
     - Notification: Slack/Email
     
  9. 🚀 Blue/Green Deployment
     - Deploy to green environment
     - Run smoke tests
     - Switch traffic (ALB)
     - Keep blue for rollback
     
  10. 🧪 Production Tests
      - Health checks
      - Critical user journeys
      - Performance benchmarks
      
  11. 📊 Monitoring
      - CloudWatch alarms active
      - Error rate < 1%
      - Response time < 500ms
      - Auto-rollback if issues
      
  12. 📢 Release Notifications
      - GitHub Release created
      - Slack: production deployed
      - Status page updated
      - Customer email (if major)

Environment: tickr.tn
Duration: ~25-30 minutes
Rollback: One-click via GitHub Actions
```

#### 🔧 Workflow: Database Migrations

**Trigger :** Manual dispatch or scheduled

```yaml
Jobs:
  1. 🔍 Migration Validation
     - Dry-run on staging clone
     - Check for destructive changes
     - Estimate execution time
     
  2. 📸 Backup
     - RDS snapshot
     - Export to S3
     - Verify backup integrity
     
  3. ⚙️ Execute Migrations
     - Run TypeORM migrations
     - Progressive execution
     - Real-time monitoring
     
  4. ✅ Validation
     - Schema verification
     - Data integrity checks
     - Performance benchmarks
     
  5. 📢 Notification
     - Slack: migration complete
     - Update documentation

Duration: Variable (5-30 min)
Rollback: Automatic on failure
```

#### 📊 Workflow Monitoring Dashboard

```
GitHub Actions Dashboard:
  - ✅ Success rate: >95%
  - ⏱️ Average duration: CI=10min, CD=20min
  - 📈 Deployment frequency: 2-3x/day (staging), 2x/week (prod)
  - 🔄 Rollback rate: <2%
  - 🐛 Bug escape rate: <5%
```

**📖 Plus de détails :** [CI/CD Pipeline](docs/04-infrastructure/03-cicd-pipeline.md)

---

## 💰 Modèle Économique

- **Commission plateforme :** 6% par billet vendu (payé par l'organisateur)
- **Frais de transaction :** Absorbés par la plateforme
- **Remboursements :** Politique configurable par organisateur
- **Configuration :** Taux de commission configurable via variable d'environnement (`PLATFORM_COMMISSION_RATE`)

**Exemple :**
```
Billet à 50 TND
→ Participant paie : 53 TND
→ Organisateur reçoit : 47 TND (50 - 6%)
→ Tickr reçoit : 3 TND
```

**📖 Plus de détails :** [Modèle Économique](docs/02-technique/04-modele-economique.md)

---

## 🗺️ Roadmap

### ✅ V1 - MVP (3 mois) - **En cours**

**Objectif :** Lancer la plateforme avec fonctionnalités essentielles

- [x] Documentation complète
- [ ] Backend NestJS (6 modules)
- [ ] Frontend React
- [ ] Authentification JWT
- [ ] CRUD Événements
- [ ] Paiement Clictopay/Stripe
- [ ] Génération QR codes
- [ ] Emails transactionnels
- [ ] Dashboard organisateur
- [ ] Déploiement AWS (ECS)

**Date cible :** T1 2026

### 🔄 V2 - Croissance (6 mois)

**Objectif :** Améliorer l'expérience et scaler

- [ ] Application mobile React Native
- [ ] Notifications push
- [ ] Multilangue (Français, Arabe, Anglais)
- [ ] Recommandations événements (ML)
- [ ] Programme de fidélité
- [ ] API publique (partenaires)
- [ ] Migration microservices (Payments)
- [ ] CloudFront CDN
- [ ] Multi-AZ RDS

**Date cible :** T3 2026

### 🚀 V3 - Scale & Innovation (12 mois)

**Objectif :** Devenir leader régional

- [ ] Expansion Maghreb (Algérie, Maroc)
- [ ] Places numérotées / Plans de salles
- [ ] Marketplace merchandising
- [ ] Live streaming événements
- [ ] Chatbot support (IA)
- [ ] Architecture microservices complète
- [ ] Multi-région AWS

**Date cible :** T4 2027

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. **Fork** le projet
2. Créer une **branche** (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add: AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une **Pull Request**

### Standards de Code

- **Backend :** ESLint + Prettier (config NestJS)
- **Frontend :** ESLint + Prettier (config React)
- **Commits :** Convention Conventional Commits
- **Tests :** Obligatoires pour nouvelles features

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Équipe

**Développé par :** [Iheb Rjeb](https://github.com/IhebRjeb)

**Contact :**
- **Email :** contact@tickr.tn
- **Twitter :** [@tickrtn](https://twitter.com/tickrtn)
- **LinkedIn :** [Tickr](https://linkedin.com/company/tickr-tn)

---

## 🙏 Remerciements

- [NestJS](https://nestjs.com/) pour le framework backend
- [React](https://react.dev/) pour le framework frontend
- [AWS](https://aws.amazon.com/) pour l'infrastructure cloud
- [Stripe](https://stripe.com/) pour les paiements internationaux
- La communauté open-source pour les nombreuses bibliothèques utilisées

---

## 📊 Métriques du Projet

![GitHub stars](https://img.shields.io/github/stars/IhebRjeb/Tickr?style=social)
![GitHub forks](https://img.shields.io/github/forks/IhebRjeb/Tickr?style=social)
![GitHub issues](https://img.shields.io/github/issues/IhebRjeb/Tickr)
![GitHub pull requests](https://img.shields.io/github/issues-pr/IhebRjeb/Tickr)

---

<div align="center">

**[Documentation](docs/README.md)** • **[Changelog](CHANGELOG.md)** • **[Contribute](CONTRIBUTING.md)**

Made with ❤️ for the Tunisian tech community

</div>
