# 🏛️ Architecture Tests - README

## 🎯 Objectif

Ce dossier contient les **Architecture Fitness Functions** qui garantissent que le code respecte les principes de l'**Architecture Hexagonale** définis pour Tickr.

## 📁 Structure

```
backend/test/architecture/
└── architecture.spec.ts      # Tous les tests architecture (30 tests)
```

## 🚀 Lancer les Tests

### Tests Architecture Uniquement

```bash
cd backend
npm run test:arch
```

### Tous les Tests

```bash
# Unitaires + Intégration + E2E + Architecture
npm run test:all
```

### Watch Mode (développement)

```bash
npm run test:arch -- --watch
```

## ✅ Ce qui est testé

### 10 Catégories de Tests

| # | Catégorie | Tests | Description |
|---|-----------|-------|-------------|
| 1 | 📦 Isolation Modules | 2 | Vérifie structure hexagonale et pas d'imports cross-module |
| 2 | 🎯 Domain Pureté | 4 | Domain = TypeScript pur (pas de framework) |
| 3 | ⚙️ Application Use Cases | 4 | Application utilise uniquement des Ports |
| 4 | 🔌 Infrastructure Adapters | 4 | Repositories implémentent Ports |
| 5 | 🗄️ Database Schemas | 2 | 1 schema PostgreSQL par module |
| 6 | 📢 Event-Driven | 2 | Communication inter-module via Events |
| 7 | 📝 Naming Conventions | 2 | Fichiers suivent conventions (*.entity.ts, etc) |
| 8 | ✅ Code Quality | 3 | Pas de console.log, exceptions bien placées |
| 9 | 🧪 Test Structure | 2 | Tests unitaires purs pour Domain |
| 10 | 📋 Documentation | 2 | Swagger avec @ApiTags, @ApiOperation |

**Total: 30 tests automatisés**

## 📋 Règles Principales

### ✅ Règle 1: Domain Isolé

```typescript
// ✅ AUTORISÉ - Domain pur
export class Event {
  publish(): void {
    if (this.status !== EventStatus.DRAFT) {
      throw new EventAlreadyPublishedException();
    }
    this.status = EventStatus.PUBLISHED;
  }
}

// ❌ INTERDIT - Import framework dans Domain
import { Entity } from 'typeorm'; // ❌
```

**Test:** Détecte imports `@nestjs`, `typeorm`, `express`, `aws-sdk` dans `domain/`

---

### ✅ Règle 2: Application définit Ports

```typescript
// ✅ AUTORISÉ - Port (interface)
export interface EventRepositoryPort {
  save(event: Event): Promise<Event>;
  findById(id: string): Promise<Event | null>;
}

// ✅ AUTORISÉ - Handler utilise Port
@CommandHandler(CreateEventCommand)
export class CreateEventHandler {
  constructor(
    @Inject('EventRepositoryPort')
    private readonly repo: EventRepositoryPort,
  ) {}
}

// ❌ INTERDIT - Application importe TypeORM
import { Repository } from 'typeorm'; // ❌
```

**Test:** Détecte imports `typeorm`, `express`, `aws-sdk` dans `application/`

---

### ✅ Règle 3: Infrastructure implémente Ports

```typescript
// ✅ AUTORISÉ - Repository implémente Port
@Injectable()
export class EventRepository implements EventRepositoryPort {
  constructor(@InjectRepository(EventEntity) private repo: Repository<EventEntity>) {}
  
  async save(event: Event): Promise<Event> {
    // Mapping Domain ↔ TypeORM
  }
}
```

**Test:** Vérifie que Repositories dans `infrastructure/` implémentent un Port

---

### ✅ Règle 4: Pas d'imports cross-module

```typescript
// ✅ AUTORISÉ - Communication via Event
this.eventBus.publish(new PaymentCompletedEvent(orderId));

// ❌ INTERDIT - Import direct autre module
import { TicketService } from '../../tickets/...'; // ❌
```

**Test:** Détecte imports directs entre modules

---

### ✅ Règle 5: Schema isolation

```typescript
// ✅ AUTORISÉ - Entity avec son schema
@Entity({ schema: 'events', name: 'events' })
export class EventEntity {
  @Column()
  organizerId: string; // ← ID only, pas de relation
}

// ❌ INTERDIT - FK cross-schema
@ManyToOne(() => UserEntity) // ❌ Relation vers autre module
organizer: UserEntity;
```

**Test:** Vérifie schema = module name et pas de relations cross-schema

---

### ✅ Règle 6: Naming Conventions

```yaml
Conventions:
  domain/entities/         → *.entity.ts      → class XxxEntity
  domain/value-objects/    → *.vo.ts          → class XxxVO
  domain/events/           → *.event.ts       → class XxxEvent
  application/commands/    → *.command.ts     → class XxxCommand
  application/queries/     → *.query.ts       → class XxxQuery
  application/ports/       → *.port.ts        → interface XxxPort
  infrastructure/controllers/ → *.controller.ts → class XxxController
  infrastructure/repositories/ → *.repository.ts → class XxxRepository
```

**Test:** Vérifie fichiers et classes suivent conventions

---

## 🔧 Intégration CI/CD

Les tests sont automatiquement lancés dans GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: 🏛️ Architecture Tests
  run: |
    cd backend
    npm run test:arch
```

❌ Le PR est **bloqué** si un test échoue.

## 📊 Exemple de Rapport

### ✅ Tests Réussis

```bash
PASS test/architecture/architecture.spec.ts
  🏛️ Architecture Hexagonale - Fitness Functions
    📦 1. Isolation des Modules
      ✓ Chaque module doit avoir sa structure hexagonale
      ✓ Les modules ne doivent pas importer d'autres modules
    🎯 2. Domain Layer - Pureté
      ✓ Domain ne doit avoir AUCUNE dépendance externe
      ✓ Entités Domain doivent être dans domain/entities/
      ✓ Value Objects doivent être dans domain/value-objects/
      ✓ Domain Events doivent être dans domain/events/
    ⚙️ 3. Application Layer - Use Cases
      ✓ Application ne doit pas importer TypeORM, Express, AWS
      ✓ Commands doivent être dans application/commands/
      ✓ Queries doivent être dans application/queries/
      ✓ Ports doivent être dans application/ports/
    ... (30 tests total)

Test Suites: 1 passed, 1 total
Tests:       30 passed, 30 total
Time:        2.134s
```

### ❌ Tests Échoués

```bash
FAIL test/architecture/architecture.spec.ts
  🏛️ Architecture Hexagonale - Fitness Functions
    🎯 2. Domain Layer - Pureté
      ✕ Domain ne doit avoir AUCUNE dépendance externe
      
    ❌ Domain file src/modules/events/domain/entities/event.entity.ts 
       imports forbidden dependency: typeorm
       → Domain must be PURE TypeScript (no @nestjs, typeorm, express, etc)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 29 passed, 30 total
```

## 🛠️ Corriger les Erreurs

### Erreur: "Domain importe TypeORM"

**Problème:**
```typescript
// src/modules/events/domain/entities/event.entity.ts
import { Entity, Column } from 'typeorm'; // ❌

@Entity()
export class Event {
  @Column()
  name: string;
}
```

**Solution:**
```typescript
// 1. Domain entity (pure)
// src/modules/events/domain/entities/event.entity.ts
export class Event {
  constructor(
    public readonly id: string,
    public name: string,
  ) {}
}

// 2. TypeORM entity (infrastructure)
// src/modules/events/infrastructure/entities/event.typeorm.entity.ts
import { Entity, Column } from 'typeorm';

@Entity({ schema: 'events', name: 'events' })
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  name: string;
}

// 3. Repository fait le mapping
export class EventRepository implements EventRepositoryPort {
  async save(event: Event): Promise<Event> {
    const entity = this.toEntity(event);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }
  
  private toDomain(entity: EventEntity): Event {
    return new Event(entity.id, entity.name);
  }
  
  private toEntity(event: Event): EventEntity {
    const entity = new EventEntity();
    entity.id = event.id;
    entity.name = event.name;
    return entity;
  }
}
```

### Erreur: "Module importe autre module"

**Problème:**
```typescript
// src/modules/tickets/application/handlers/generate-tickets.handler.ts
import { EventService } from '../../../events/...'; // ❌
```

**Solution:**
```typescript
// 1. Module Payments émet event
this.eventBus.publish(new PaymentCompletedEvent(orderId));

// 2. Module Tickets écoute
@EventsHandler(PaymentCompletedEvent)
export class GenerateTicketsHandler {
  handle(event: PaymentCompletedEvent) {
    // Génère billets
  }
}
```

### Erreur: "Naming convention non respectée"

**Problème:**
```typescript
// src/modules/events/domain/entities/Event.ts ❌ (pas de suffix)
```

**Solution:**
```typescript
// src/modules/events/domain/entities/event.entity.ts ✅
export class Event { ... }
```

## 📚 Documentation Complète

Pour comprendre en profondeur:

1. **Principes Hexagonaux:** `docs/03-architecture/01-principes-hexagonaux.md`
2. **Structure Modules:** `docs/03-architecture/02-structure-modules.md`
3. **Fitness Functions:** `docs/03-architecture/05-fitness-functions.md`

## ✅ Checklist Avant Coding

Avant de commencer un nouveau module:

```yaml
✅ Lecture:
  - [ ] Lire docs/03-architecture/01-principes-hexagonaux.md
  - [ ] Lire docs/03-architecture/02-structure-modules.md
  - [ ] Lire docs/03-architecture/05-fitness-functions.md

✅ Setup:
  - [ ] Créer structure: domain/, application/, infrastructure/
  - [ ] Créer base classes si nécessaire
  - [ ] Lancer `npm run test:arch` pour voir warnings

✅ Développement:
  - [ ] Coder en respectant les layers
  - [ ] Lancer `npm run test:arch` régulièrement
  - [ ] Corriger violations immédiatement

✅ Review:
  - [ ] Tests architecture passent
  - [ ] ESLint passe
  - [ ] Tests unitaires passent
```

## 🤝 Contribution

Si un test architecture signale une fausse alerte ou si vous souhaitez ajouter un nouveau test:

1. Ouvrir une issue avec le contexte
2. Proposer modification via PR
3. Documenter le rationale

---

**Besoin d'aide?** Consultez `docs/03-architecture/05-fitness-functions.md` ou ouvrez une issue GitHub.
