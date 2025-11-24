# 📚 Documentation Tickr - Plateforme de Billetterie (Tunisie)

**Version:** 1.0  
**Date:** 23 Novembre 2025  
**Équipe:** Solo/Duo Developer  
**Stack:** React + NestJS + PostgreSQL + AWS

---

## 🎯 Vue d'Ensemble

Documentation complète pour développer une plateforme de billetterie en ligne pour le marché tunisien, structurée en Monolithe Modulaire Hexagonal avec migration progressive vers microservices.

### Décisions Validées

- **Architecture:** Monolithe Modulaire Hexagonal V1 → Migration Progressive V2/V3
- **Commission:** 4% par billet vendu (payé par organisateur)
- **Paiements:** Clictopay/Edinar (Tunisie) + Stripe (international)
- **MVP Timeline:** 3 mois (20-40h/semaine)
- **Budget AWS V1:** $80-100/mois

---

## 📂 Structure Documentation

```
docs/
├── README.md                           # Ce fichier - Index principal
│
├── 01-fonctionnel/                     # SPÉCIFICATIONS MÉTIER
│   ├── 01-vue-ensemble.md              # Vision produit, acteurs, workflows
│   ├── 02-specifications-detaillees.md # User stories, features V1/V2/V3
│   └── 03-regles-metier.md             # Contraintes business Tunisie
│
├── 02-technique/                       # SPÉCIFICATIONS TECHNIQUES
│   ├── 01-stack-technique.md           # React, NestJS, PostgreSQL, Redis
│   ├── 02-api-contract.md              # REST endpoints + OpenAPI spec
│   ├── 03-database-schema.md           # Schémas PostgreSQL + ERD
│   └── 04-modele-economique.md         # Calculs commissions, revenus
│
├── 03-architecture/                    # ARCHITECTURE SYSTÈME
│   ├── 00-architecture-governance-summary.md  # Governance overview
│   ├── 01-principes-hexagonaux.md      # Ports & Adapters, DDD
│   ├── 02-structure-modules.md         # 6 modules (Events, Payments, etc.)
│   ├── 03-event-driven.md              # Event Bus, Domain Events
│   ├── 04-migration-microservices.md   # Plan migration V1→V2→V3
│   ├── 05-fitness-functions.md         # 30 architecture tests explained
│   ├── 06-architecture-quick-ref.md    # Quick commands & fixes
│   ├── 07-tests-verification.md        # CI/CD integration verification
│   ├── 08-ci-integration-complete.md   # Complete CI/CD summary
│   ├── 09-backend-setup-guide.md       # NestJS initialization guide
│   ├── 10-development-cicd-alignment.md # Dev/CI/CD alignment guide
│   ├── 11-database-testing-strategy.md # Database testing strategy
│   └── DATABASE_TESTING_QUICK_GUIDE.md # Database testing quick guide
│
├── 04-infrastructure/                  # INFRASTRUCTURE & DÉPLOIEMENT
│   ├── 01-aws-architecture.md          # ECS, RDS, S3, EventBridge
│   ├── 02-terraform-setup.md           # IaC configuration
│   ├── 03-cicd-pipeline.md             # GitHub Actions
│   └── 04-monitoring.md                # CloudWatch, X-Ray, alerting
│
├── 05-git-workflow/                    # GIT WORKFLOW & CI/CD
    ├── 00-summary.md                   # Git workflow overview
    ├── 01-branching-strategy.md        # Branching model
    ├── 02-errors-and-fixes.md          # Common issues & solutions
    └── 03-architecture-tests-in-cicd.md # Architecture tests in pipeline
│
└── 06-testing/                         # TESTING GUIDES
    ├── README.md                       # Testing overview & quick reference
    ├── 01-frontend-testing-architecture.md # Frontend test separation
    ├── 02-frontend-testing-guide.md    # Vitest & Playwright guide
    └── 03-backend-testing-guide.md     # Jest, Integration & E2E tests
```

---

## 🚀 Parcours de Lecture Recommandé

### Pour Développement Immédiat (Avant Sprint 1)

**Lecture obligatoire dans l'ordre:**

1. **`01-fonctionnel/01-vue-ensemble.md`** (15 min)
   - Comprendre les acteurs et workflows métier
   
2. **`02-technique/01-stack-technique.md`** (10 min)
   - Valider choix technologiques
   
3. **`03-architecture/01-principes-hexagonaux.md`** (20 min)
   - Maîtriser les fondamentaux architecture
   
4. **`03-architecture/02-structure-modules.md`** (30 min)
   - Comprendre organisation code (6 modules)
   
5. **`02-technique/03-database-schema.md`** (20 min)
   - Étudier structure base de données

**Total:** ~1h30 pour être prêt à coder

---

### Pour Compréhension Complète (Week-end avant projet)

**Jour 1 - Fonctionnel & Technique (3h)**

1. `01-fonctionnel/01-vue-ensemble.md` (30 min)
2. `01-fonctionnel/02-specifications-detaillees.md` (60 min)
3. `01-fonctionnel/03-regles-metier.md` (15 min)
4. `02-technique/01-stack-technique.md` (20 min)
5. `02-technique/02-api-contract.md` (30 min)
6. `02-technique/03-database-schema.md` (30 min)

**Jour 2 - Architecture & Infrastructure (3h)**

7. `03-architecture/01-principes-hexagonaux.md` (45 min)
8. `03-architecture/02-structure-modules.md` (60 min)
9. `03-architecture/03-event-driven.md` (30 min)
10. `04-infrastructure/01-aws-architecture.md` (45 min)

**Total:** ~6h pour maîtrise complète

---

## 📋 Documents par Phase Projet

### Phase 0: Préparation (Avant coding)
```
✅ 01-fonctionnel/01-vue-ensemble.md
✅ 02-technique/01-stack-technique.md
✅ 03-architecture/01-principes-hexagonaux.md
✅ 04-infrastructure/01-aws-architecture.md
```

### Phase 1: Sprint 1-2 (Events Module)
```
✅ 03-architecture/02-structure-modules.md (section Events)
✅ 02-technique/03-database-schema.md (schema events)
✅ 02-technique/02-api-contract.md (endpoints events)
```

### Phase 2: Sprint 3-4 (Payments Module)
```
✅ 03-architecture/02-structure-modules.md (section Payments)
✅ 02-technique/04-modele-economique.md (commissions)
✅ 01-fonctionnel/03-regles-metier.md (paiements Tunisie)
```

### Phase 3: Migration Microservices (V2)
```
✅ 03-architecture/04-migration-microservices.md
✅ 03-architecture/03-event-driven.md
✅ 04-infrastructure/01-aws-architecture.md (V2 section)
```

---

## 🎯 Checklist Avant Développement

### Documentation Lue et Comprise

```yaml
✅ Fonctionnel:
  - [ ] Je comprends les 3 acteurs principaux
  - [ ] Je connais les 5 workflows critiques
  - [ ] Je maîtrise les règles métier Tunisie

✅ Technique:
  - [ ] Stack validée (React, NestJS, PostgreSQL)
  - [ ] API REST endpoints définis
  - [ ] Schémas database compris

✅ Architecture:
  - [ ] Principes hexagonaux maîtrisés
  - [ ] Structure 6 modules claire
  - [ ] Event-Driven pattern compris

✅ Infrastructure:
  - [ ] Architecture AWS V1 validée
  - [ ] Budget mensuel acceptable
  - [ ] Plan scaling V2/V3 compris
```

### Environnement Préparé

```yaml
✅ Outils Installés:
  - [ ] Node.js 20+ LTS
  - [ ] Docker Desktop
  - [ ] PostgreSQL 15+
  - [ ] Redis
  - [ ] AWS CLI
  - [ ] Terraform

✅ Comptes Créés:
  - [ ] AWS Account (Free Tier)
  - [ ] Clictopay/Edinar (Tunisia)
  - [ ] Stripe (international)
  - [ ] GitHub (repository)

✅ Setup Local:
  - [ ] Repository Git initialisé
  - [ ] Docker Compose configuré
  - [ ] Variables environnement (.env)
```

---

## 📊 Métriques Documentation

### Couverture

| Catégorie | Pages | Complétude | Priorité |
|-----------|-------|-----------|----------|
| Fonctionnel | 3 | 100% ✅ | P0 |
| Technique | 4 | 100% ✅ | P0 |
| Architecture | 13 | 100% ✅ | P0 |
| Infrastructure | 4 | 100% ✅ | P1 |
| Git Workflow | 4 | 100% ✅ | P0 |
| Testing | 4 | 100% ✅ | P0 |
| **Total** | **32** | **100%** | - |

### Temps de Lecture

- **Quick Start:** 1h30 (5 docs essentiels)
- **Complet:** 10h (25 docs)
- **Par catégorie:** ~1h30-2h chacune

---

## 🏛️ Architecture Tests & CI/CD (Priority for Developers)

**Before writing any code, read these in order:**

1. **`03-architecture/06-architecture-quick-ref.md`** (10 min)
   - Quick commands and common violations
   
2. **`03-architecture/01-principes-hexagonaux.md`** (20 min)
   - Hexagonal architecture fundamentals
   
3. **`03-architecture/05-fitness-functions.md`** (30 min)
   - 30 architecture tests explained
   
4. **`05-git-workflow/03-architecture-tests-in-cicd.md`** (15 min)
   - CI/CD pipeline with architecture enforcement

**Total:** ~75 min to understand architecture governance

---

## 🔄 Mise à Jour Documentation

### Quand mettre à jour ?

```yaml
Fonctionnel:
  - Changement scope MVP
  - Nouvelles features V2/V3
  - Retours utilisateurs tests

Technique:
  - Changement stack
  - Nouveaux endpoints API
  - Évolution schéma DB

Architecture:
  - Migration microservice
  - Nouveau pattern implémenté
  - Refactoring majeur

Infrastructure:
  - Changement services AWS
  - Scaling (plus d'instances)
  - Nouvelle région
```

---

## 📚 Ressources Externes

### Documentation Officielle

- [NestJS](https://docs.nestjs.com/)
- [React](https://react.dev/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [AWS ECS](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/)

### Architecture

- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)
- [Event-Driven Microservices](https://microservices.io/patterns/data/event-driven-architecture.html)

### Paiements Tunisie

- [Clictopay](https://www.clictopay.com.tn/)
- [Edinar](https://www.edinar.tn/)
- [Stripe Tunisia](https://stripe.com/docs/connect/payouts)

---

## 🎉 Prochaine Étape

**Commencez par:**

```bash
1. Lire: 01-fonctionnel/01-vue-ensemble.md
2. Lire: 02-technique/01-stack-technique.md
3. Lire: 03-architecture/01-principes-hexagonaux.md
```

**Puis:**

- Setup environnement local (Docker, PostgreSQL)
- Initialiser repository NestJS
- Premier module (Events)

---

**Bonne chance ! 🚀**
