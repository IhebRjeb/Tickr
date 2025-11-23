# 🏛️ Architecture Fitness Functions - Documentation

**Version:** 1.0  
**Temps lecture:** 10 minutes

---

## 🎯 Qu'est-ce qu'une Fitness Function?

Une **Architecture Fitness Function** est un **test automatisé** qui vérifie que le code respecte les **contraintes architecturales** définies.

### Analogie

Comme les tests unitaires vérifient la **logique métier**, les fitness functions vérifient l'**architecture**.

```
Tests Unitaires    →  "Est-ce que le code FONCTIONNE?"
Fitness Functions  →  "Est-ce que le code est BIEN STRUCTURÉ?"
```

---

## ✅ Avantages

### 1. Protection Architecture

```yaml
❌ Sans fitness functions:
  - Développeur met TypeORM dans Domain par erreur
  - Code Review peut rater l'erreur
  - Dette technique s'accumule

✅ Avec fitness functions:
  - Test échoue immédiatement
  - CI/CD bloque le PR
  - Architecture protégée automatiquement
```

### 2. Onboarding Facilité

```yaml
Nouveau dev:
  "Puis-je importer @nestjs/typeorm dans Domain?"
  
Sans docs:
  → Cherche dans docs (peut-être périmées)
  
Avec fitness functions:
  → Lance `npm run test:arch`
  → Voit erreur: "Domain cannot import @nestjs"
  → Comprend immédiatement la règle
```

### 3. Refactoring Sûr

```yaml
Refactoring:
  - Déplace des fichiers
  - Change des imports
  
Sans protection:
  - Peut casser l'architecture sans le savoir
  
Avec fitness functions:
  - Tests échouent si architecture violée
  - Refactoring en confiance
```

---

## 📋 10 Catégories de Tests

Notre suite contient **10 catégories** de tests:

### 1. 📦 Isolation des Modules

**Règle:** Les 6 modules doivent être **isolés** (pas d'imports directs entre modules).

```typescript
✅ AUTORISÉ:
// Module Events émet un event
this.eventBus.publish(new EventPublishedEvent(event.id));

❌ INTERDIT:
// Module Events importe directement Tickets
import { TicketService } from '../../tickets/application/ticket.service';
```

**Tests:**
- Vérifie structure hexagonale (domain/, application/, infrastructure/)
- Détecte imports cross-module

### 2. 🎯 Domain Layer - Pureté

**Règle:** Domain = **TypeScript pur** (pas de framework, DB, AWS, etc).

```typescript
✅ AUTORISÉ - Domain Entity:
export class Event {
  constructor(
    public readonly id: string,
    public name: string,
  ) {}
  
  publish(): void {
    if (this.status !== EventStatus.DRAFT) {
      throw new EventAlreadyPublishedException();
    }
    this.status = EventStatus.PUBLISHED;
  }
}

❌ INTERDIT - Domain avec TypeORM:
import { Entity, Column } from 'typeorm'; // ❌ Forbidden!

@Entity() // ❌ Framework decorator
export class Event {
  @Column() // ❌ DB decorator
  name: string;
}
```

**Tests:**
- Détecte imports @nestjs, typeorm, express, aws-sdk dans Domain
- Vérifie naming conventions (*.entity.ts, *.vo.ts, *.event.ts)

### 3. ⚙️ Application Layer - Use Cases

**Règle:** Application définit **interfaces (Ports)**, orchestre use cases.

```typescript
✅ AUTORISÉ - Port Interface:
// application/ports/event.repository.port.ts
export interface EventRepositoryPort {
  save(event: Event): Promise<Event>;
  findById(id: string): Promise<Event | null>;
}

✅ AUTORISÉ - Handler uses Port:
@CommandHandler(CreateEventCommand)
export class CreateEventHandler {
  constructor(
    @Inject('EventRepositoryPort') // ← Injection via interface
    private readonly repo: EventRepositoryPort,
  ) {}
}

❌ INTERDIT - Application importe TypeORM:
import { Repository } from 'typeorm'; // ❌ Forbidden!
```

**Tests:**
- Détecte imports typeorm, express, aws-sdk dans Application
- Vérifie Commands/Queries structure
- Vérifie Ports sont des interfaces

### 4. 🔌 Infrastructure Layer - Adapters

**Règle:** Infrastructure **implémente les Ports** définis dans Application.

```typescript
✅ AUTORISÉ - Repository Adapter:
// infrastructure/repositories/event.repository.ts
import { EventRepositoryPort } from '../../application/ports/event.repository.port';

@Injectable()
export class EventRepository implements EventRepositoryPort {
  constructor(@InjectRepository(EventEntity) private repo: Repository<EventEntity>) {}
  
  async save(event: Event): Promise<Event> {
    // Mapping Domain ↔ TypeORM
  }
}

✅ AUTORISÉ - Module provides Port:
@Module({
  providers: [
    {
      provide: 'EventRepositoryPort',
      useClass: EventRepository,
    },
  ],
})
export class EventsModule {}
```

**Tests:**
- Vérifie Repositories implémentent Ports
- Vérifie Controllers ont @Controller()
- Vérifie naming conventions

### 5. 🗄️ Database - Schema Isolation

**Règle:** 1 **schema PostgreSQL par module** (pas de FK cross-schema).

```typescript
✅ AUTORISÉ - Entity avec schema:
@Entity({ schema: 'events', name: 'events' })
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  organizerId: string; // ← Juste l'ID, pas de relation
}

❌ INTERDIT - FK vers autre module:
@Entity({ schema: 'events' })
export class EventEntity {
  @ManyToOne(() => UserEntity) // ❌ Relation vers module Users
  organizer: UserEntity;
}
```

**Tests:**
- Vérifie schema name = module name
- Détecte relations TypeORM cross-module

### 6. 📢 Event-Driven Communication

**Règle:** Communication inter-module **uniquement via Events**.

```typescript
✅ AUTORISÉ - Publish Event:
// Module Payments
this.eventBus.publish(new PaymentCompletedEvent(orderId));

✅ AUTORISÉ - Listen Event:
// Module Tickets écoute
@EventsHandler(PaymentCompletedEvent)
export class GenerateTicketsHandler {
  handle(event: PaymentCompletedEvent) {
    // Génère billets
  }
}

❌ INTERDIT - Appel direct:
import { TicketService } from '../../tickets/...'; // ❌
await this.ticketService.generate(); // ❌
```

**Tests:**
- Vérifie Domain Events héritent de base class
- Détecte imports cross-module (déjà testé dans #1)

### 7. 📝 Naming Conventions

**Règle:** Noms de fichiers et classes **standardisés**.

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

**Tests:**
- Vérifie patterns de fichiers
- Vérifie suffixes de classes

### 8. ✅ Code Quality Rules

**Règles supplémentaires:**

```typescript
❌ Pas de console.log:
console.log('Debug'); // ❌ Use Logger instead

✅ Exceptions métier dans domain/exceptions/:
export class EventAlreadyPublishedException extends Error {}

✅ DTOs avec validation:
export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  
  @IsDate()
  startDate: Date;
}
```

**Tests:**
- Détecte console.log/debug/etc
- Vérifie exceptions extend Error
- Vérifie DTOs ont decorators class-validator

### 9. 🧪 Test Structure

**Règle:** Tests organisés par layer.

```
test/
├── unit/
│   ├── events/
│   │   ├── domain/        # Tests purs (pas de mocks)
│   │   ├── application/   # Tests avec mocks
│   │   └── infrastructure/
├── integration/           # Tests DB, Redis
└── e2e/                   # Tests API complètes
```

**Tests:**
- Vérifie structure test/unit/<module>/
- Vérifie Domain tests sont purs (pas de @nestjs/testing)

### 10. 📋 Documentation

**Règle:** API Swagger complète.

```typescript
✅ AUTORISÉ - Controller documenté:
@Controller('events')
@ApiTags('Events')
export class EventController {
  
  @Post()
  @ApiOperation({ summary: 'Create new event' })
  @ApiResponse({ status: 201, type: EventDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateEventDto) {
    // ...
  }
}
```

**Tests:**
- Vérifie @ApiTags() sur Controllers
- Vérifie @ApiOperation() sur endpoints

---

## 🚀 Utilisation

### Lancer les Tests Architecture

```bash
# Tous les tests architecture
npm run test:arch

# Avec watch mode
npm run test:arch -- --watch

# Verbose mode
npm run test:arch -- --verbose
```

### Dans CI/CD

```yaml
# .github/workflows/ci.yml
- name: 🏛️ Architecture Tests
  run: npm run test:arch
```

Les tests échoueront si une règle est violée → **Bloque le merge**.

---

## 📊 Rapport d'Exemple

```
PASS test/architecture/architecture.spec.ts
  🏛️ Architecture Hexagonale - Fitness Functions
    📦 1. Isolation des Modules
      ✓ Chaque module doit avoir sa structure hexagonale (15ms)
      ✓ Les modules ne doivent pas importer d'autres modules directement (23ms)
    🎯 2. Domain Layer - Pureté
      ✓ Domain ne doit avoir AUCUNE dépendance externe (18ms)
      ✓ Entités Domain doivent être dans domain/entities/ (5ms)
      ✓ Value Objects doivent être dans domain/value-objects/ (4ms)
      ✓ Domain Events doivent être dans domain/events/ (6ms)
    ⚙️ 3. Application Layer - Use Cases
      ✓ Application ne doit pas importer TypeORM, Express, AWS SDK (12ms)
      ✓ Commands doivent être dans application/commands/ (7ms)
      ✓ Queries doivent être dans application/queries/ (6ms)
      ✓ Ports (interfaces) doivent être dans application/ports/ (9ms)
    🔌 4. Infrastructure Layer - Adapters
      ✓ Repositories doivent être dans infrastructure/repositories/ (11ms)
      ✓ Controllers doivent être dans infrastructure/controllers/ (8ms)
      ✓ Adapters doivent être dans infrastructure/adapters/ (5ms)
      ✓ Module NestJS doit être dans infrastructure/ (7ms)
    🗄️ 5. Database - Schema Isolation
      ✓ Chaque module doit utiliser son propre schema PostgreSQL (14ms)
      ✓ Pas de Foreign Keys entre schémas différents (19ms)
    📢 6. Event-Driven Communication
      ✓ Domain Events doivent hériter de base DomainEvent (10ms)
      ✓ Communication inter-module uniquement via Events (2ms)
    📝 7. Naming Conventions
      ✓ Fichiers doivent respecter les conventions de nommage (21ms)
      ✓ Classes doivent avoir des suffixes appropriés (16ms)
    ✅ 8. Code Quality Rules
      ✓ Pas de console.log dans le code production (13ms)
      ✓ Exceptions métier doivent être dans domain/exceptions/ (8ms)
      ✓ DTOs doivent utiliser class-validator decorators (11ms)
    🧪 9. Test Structure
      ✓ Chaque module doit avoir des tests unitaires (6ms)
      ✓ Domain entities doivent avoir des tests unitaires purs (9ms)
    📋 10. Documentation
      ✓ Controllers doivent avoir @ApiTags() pour Swagger (7ms)
      ✓ Endpoints doivent avoir @ApiOperation() et @ApiResponse() (12ms)

Test Suites: 1 passed, 1 total
Tests:       30 passed, 30 total
Time:        2.134s
```

---

## 🔧 Intégration ESLint

Les fitness functions sont complémentaires aux règles ESLint.

### ESLint pour Syntax

```json
{
  "rules": {
    "no-console": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error"
  }
}
```

### Fitness Functions pour Architecture

```typescript
// ESLint ne peut pas vérifier ça:
"Domain ne doit pas importer @nestjs"

// Fitness Function peut:
expect(hasForbiddenImport(domainFiles, ['@nestjs'])).toBe(false);
```

---

## ✅ Checklist Avant de Coder

Avant de commencer à implémenter les modules:

```yaml
✅ Setup:
  - [ ] Lire docs/03-architecture/01-principes-hexagonaux.md
  - [ ] Lire docs/03-architecture/02-structure-modules.md
  - [ ] Comprendre les 6 modules et leurs responsabilités
  - [ ] Lire ce document (Architecture Fitness Functions)

✅ Tests Architecture:
  - [ ] backend/test/architecture/architecture.spec.ts créé
  - [ ] Commande `npm run test:arch` configurée dans package.json
  - [ ] Tests passent (warnings normaux si projet vide)

✅ CI/CD:
  - [ ] Architecture tests dans .github/workflows/ci.yml
  - [ ] Tests bloquent merge si échec

✅ Développement:
  - [ ] Créer module en respectant structure hexagonale
  - [ ] Lancer `npm run test:arch` régulièrement
  - [ ] Corriger violations immédiatement
  - [ ] Code review vérifie tests architecture passent
```

---

## 🎓 Philosophie

Les Architecture Fitness Functions ne sont pas là pour **ralentir** le développement, mais pour:

1. **Guider** les développeurs vers les bonnes pratiques
2. **Protéger** l'architecture contre l'érosion
3. **Faciliter** l'onboarding des nouveaux devs
4. **Documenter** les contraintes de façon exécutable
5. **Permettre** refactoring en confiance

> "Architecture is about constraints. Fitness Functions enforce them."

---

## 📚 Ressources

- **Livre:** "Building Evolutionary Architectures" (O'Reilly)
- **Article:** [Architecture Fitness Functions](https://www.thoughtworks.com/insights/blog/fitness-function-driven-development)
- **Video:** [Hexagonal Architecture in Practice](https://www.youtube.com/watch?v=th4AgBcrEHA)

---

**Prochaine lecture:** Commencer l'implémentation du premier module (Users).
