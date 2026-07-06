# 🛠️ Stack Technique - Tickr

**Version:** 1.0  
**Temps lecture:** 10 minutes

---

## 🎯 Vue d'Ensemble

### Architecture Globale

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│            Next.js 16 + TypeScript                   │
│     App Router + TailwindCSS + React Query           │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS/REST
                   ↓
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│              NestJS + TypeScript                     │
│        Monolithe Modulaire Hexagonal                │
└──────────────────┬──────────────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ↓             ↓             ↓
┌─────────┐  ┌──────────┐  ┌─────────┐
│PostgreSQL│  │  Redis   │  │   S3    │
│  15.4    │  │   7.x    │  │ Images  │
└─────────┘  └──────────┘  └─────────┘
```

---

## 🎨 Frontend

### Framework & Outils

**Core:**
- **Next.js 16.x** - React framework with App Router
- **React 19** - UI library (Server + Client Components)
- **TypeScript 5.9+** - Type safety

**Styling:**
- **TailwindCSS 4.x** - Utility-first CSS
- **Headless UI 2.x** - Accessible components
- **Heroicons 2.x** - Icon library

**State Management:**
- **React Query (TanStack Query) 5.x** - Server state & caching
- **Zustand 5.x** - Client state (cart, preferences)

**Forms:**
- **React Hook Form 7.x** - Form management
- **Zod 3.x** - Schema validation

**HTTP Client:**
- **Axios 1.x** - API requests

**Code Quality:**
- **ESLint** (next/core-web-vitals) - Linting
- **Prettier 3.x** - Code formatting
- **TypeScript** - Type checking

**Testing:**
- **Vitest 3.x** - Unit tests
- **Testing Library 16.x** - Component tests
- **Playwright 1.x** - E2E tests

### Architecture Next.js (App Router)

#### File-based Routing

```
src/app/
├── layout.tsx              # Root layout (meta, providers)
├── page.tsx                # Home page (/)
├── globals.css             # Global styles
│
├── events/
│   ├── page.tsx            # /events (list)
│   ├── [eventId]/
│   │   ├── page.tsx        # /events/:id (details)
│   │   └── tickets/
│   │       └── page.tsx    # /events/:id/tickets
│   └── search/
│       └── page.tsx        # /events/search
│
├── tickets/
│   ├── page.tsx            # /tickets (my tickets)
│   └── [ticketId]/
│       └── page.tsx        # /tickets/:id (QR code)
│
├── auth/
│   ├── login/
│   │   └── page.tsx        # /auth/login
│   ├── register/
│   │   └── page.tsx        # /auth/register
│   └── verify/
│       └── page.tsx        # /auth/verify
│
└── dashboard/
    ├── layout.tsx          # Dashboard layout
    ├── page.tsx            # /dashboard (overview)
    ├── events/
    │   ├── page.tsx        # /dashboard/events
    │   └── [eventId]/
    │       └── page.tsx    # /dashboard/events/:id
    └── analytics/
        └── page.tsx        # /dashboard/analytics
```

#### Server vs Client Components

**Server Components (default):**
- Fetch data directly on server
- No JavaScript sent to client
- Better SEO & performance
- Access to backend resources

```tsx
// app/events/page.tsx (Server Component)
export default async function EventsPage() {
  const events = await fetch('http://backend:3000/api/events').then(r => r.json())
  
  return <EventsList events={events} />
}
```

**Client Components (interactive):**
- Use React hooks (`useState`, `useEffect`)
- Handle user interactions
- Access browser APIs

```tsx
'use client' // ← Directive required

import { useState } from 'react'

export function EventCard({ event }) {
  const [liked, setLiked] = useState(false)
  
  return (
    <div onClick={() => setLiked(!liked)}>
      {/* ... */}
    </div>
  )
}
```

### Structure Frontend

```
frontend/
├── src/
│   ├── app/                       # App Router (file-based routing)
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home page
│   │   ├── globals.css            # Global styles
│   │   ├── events/                # Events routes
│   │   ├── tickets/               # Tickets routes
│   │   ├── auth/                  # Auth routes
│   │   └── dashboard/             # Dashboard routes
│   │
│   ├── components/
│   │   ├── ui/                    # Reusable UI (Button, Input, etc.)
│   │   ├── events/                # Event-specific components
│   │   ├── tickets/               # Ticket-specific components
│   │   └── layout/                # Layout components (Header, Footer)
│   │
│   ├── lib/
│   │   ├── api/                   # API client (axios)
│   │   │   ├── client.ts          # Axios instance
│   │   │   ├── events.ts          # Events API
│   │   │   └── tickets.ts         # Tickets API
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useAuth.ts         # Auth hook
│   │   │   └── useCart.ts         # Cart hook
│   │   └── utils/                 # Utilities
│   │       ├── formatters.ts      # Date, currency formatters
│   │       └── validators.ts      # Custom validators
│   │
│   └── types/                     # TypeScript types
│       ├── events.ts              # Event types
│       ├── tickets.ts             # Ticket types
│       └── api.ts                 # API response types
│
├── public/                        # Static assets
│   ├── images/                    # Images
│   └── icons/                     # Icons
│
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # TailwindCSS configuration
├── postcss.config.mjs             # PostCSS configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies
```

### Dépendances Principales

```json
{
  "dependencies": {
    "next": "^16.0.4",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@tanstack/react-query": "^5.90.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.66.0",
    "zod": "^4.1.0",
    "axios": "^1.13.0",
    "tailwindcss": "^4.0.0",
    "@headlessui/react": "^2.2.0",
    "@heroicons/react": "^2.2.0",
    "date-fns": "^4.1.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.9.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "prettier": "^3.4.0",
    "vitest": "^4.0.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.9.0"
  }
}
```

### Next.js Features Used

| Feature | Usage | Benefit |
|---------|-------|---------|
| **App Router** | File-based routing | Simpler than React Router |
| **Server Components** | Default for all components | Better performance, SEO |
| **Server Actions** | Form submissions | No API endpoint needed |
| **Image Optimization** | `next/image` | Auto WebP, lazy loading |
| **Font Optimization** | `next/font` | Self-host Google Fonts |
| **API Routes** | `/api` folder (optional) | BFF pattern support |
| **Middleware** | `middleware.ts` | Auth, redirects, i18n |
| **Metadata API** | `generateMetadata()` | Dynamic SEO |
| **Streaming** | `loading.tsx` | Progressive rendering |
| **Error Boundaries** | `error.tsx` | Graceful error handling |

### Environnement Variables

**Development (`.env.local`):**
```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_TIMEOUT=30000

# App
NEXT_PUBLIC_APP_NAME=Tickr
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENV=development

# Features
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

**Production (AWS Secrets Manager):**
```bash
NEXT_PUBLIC_API_URL=https://api.tickr.tn
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
# Konnect & Paymee use redirect-based, server-side flows (no public key needed)
```
    "prettier": "^3.1.0"
  }
}
```

---

## ⚙️ Backend

### Framework & Architecture

**Core:**
- **NestJS 10.x** - Framework Node.js
- **TypeScript 5.3+** - Type safety
- **Node.js 20 LTS** - Runtime

**Architecture:**
- **Hexagonal (Ports & Adapters)**
- **Domain-Driven Design (DDD)**
- **CQRS Pattern** (Command Query Separation)
- **Event-Driven** (EventEmitter2 V1)

**ORM:**
- **TypeORM 0.3.x** - Object-Relational Mapping
- **Migrations** automatiques

**Validation:**
- **class-validator** - DTO validation
- **class-transformer** - DTO transformation

**Authentification:**
- **Passport JWT** - JWT strategy
- **bcrypt** - Password hashing

**Documentation:**
- **Swagger/OpenAPI** - API docs auto

**Testing:**
- **Jest** - Unit & integration tests
- **Supertest** - E2E tests

### Structure Backend

```
backend/
├── src/
│   ├── modules/
│   │   ├── events/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── event.entity.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   └── location.vo.ts
│   │   │   │   └── events/
│   │   │   │       └── event-created.event.ts
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── create-event.command.ts
│   │   │   │   │   └── create-event.handler.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── get-event.query.ts
│   │   │   │   │   └── get-event.handler.ts
│   │   │   │   └── ports/
│   │   │   │       ├── event.repository.port.ts
│   │   │   │       └── storage.port.ts
│   │   │   └── infrastructure/
│   │   │       ├── controllers/
│   │   │       │   └── event.controller.ts
│   │   │       ├── repositories/
│   │   │       │   └── event.repository.ts
│   │   │       ├── adapters/
│   │   │       │   └── s3-storage.adapter.ts
│   │   │       └── events.module.ts
│   │   │
│   │   ├── tickets/
│   │   ├── payments/
│   │   ├── users/
│   │   ├── notifications/
│   │   └── analytics/
│   │
│   ├── shared/
│   │   ├── domain/
│   │   │   ├── base-entity.ts
│   │   │   ├── value-object.base.ts
│   │   │   └── domain-event.base.ts
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   │   └── typeorm.config.ts
│   │   │   ├── event-bus/
│   │   │   │   └── in-memory.event-bus.ts
│   │   │   └── exceptions/
│   │   │       └── http-exception.filter.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       └── roles.guard.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── aws.config.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── migrations/
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### Dépendances Principales

```json
{
  "dependencies": {
    "@nestjs/common": "^10.2.0",
    "@nestjs/core": "^10.2.0",
    "@nestjs/platform-express": "^10.2.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/swagger": "^7.1.0",
    "@nestjs/event-emitter": "^2.0.0",
    "typeorm": "^0.3.17",
    "pg": "^8.11.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "uuid": "^9.0.0",
    "qrcode": "^1.5.0",
    "stripe": "^14.0.0",
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/client-ses": "^3.400.0",
    "ioredis": "^5.3.0"
  },
  "devDependencies": {
    "@nestjs/testing": "^10.2.0",
    "@types/node": "^20.9.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  }
}
```

---

## 🗄️ Base de Données

### PostgreSQL 15.4

**Choix:**
- ACID transactions
- Schemas isolation (1 par module)
- JSON support (metadata)
- Full-text search
- Excellent performance

**Configuration:**
```yaml
Version: 15.4
Instance AWS RDS: db.t3.small (V1)
Storage: 20 GB SSD (gp3)
Backup: automatique quotidien
Multi-AZ: non (V1), oui (V2)
```

**Schemas:**
```sql
CREATE SCHEMA events;
CREATE SCHEMA tickets;
CREATE SCHEMA payments;
CREATE SCHEMA users;
CREATE SCHEMA analytics;
```

**Connexion Pool:**
```typescript
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  database: 'tickr',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  poolSize: 20,
  maxQueryExecutionTime: 5000,
  logging: process.env.NODE_ENV === 'development'
}
```

### Redis 7.x

**Usage:**
- Session storage (JWT blacklist)
- Cache requêtes fréquentes
- Rate limiting
- Pub/Sub (notifications temps réel)

**Configuration:**
```yaml
Instance AWS ElastiCache: cache.t3.micro
Mode: Standalone (V1), Cluster (V2)
Eviction policy: allkeys-lru
Max memory: 512 MB
```

---

## ☁️ Services AWS

### Compute

**ECS Fargate:**
```yaml
Service: tickr-monolith
Task CPU: 512 (.5 vCPU)
Task Memory: 1024 MB
Desired count: 2
Auto-scaling: CPU > 70%
```

### Storage

**S3:**
```yaml
Bucket: tickr-event-images
Region: eu-west-1
Storage class: Standard (V1), Intelligent-Tiering (V2)
Lifecycle: Archive to Glacier après 90 jours
CDN: CloudFront (V2)
```

### Notifications

**SES (Simple Email Service):**
```yaml
Region: eu-west-1
Sending limit: 50,000 emails/jour (V1)
Bounce rate: < 5%
Templates: confirmations, rappels
```

**SNS (Simple Notification Service):**
```yaml
Usage: SMS transactionnels
Coût: $0.00645 par SMS (Tunisie)
Fallback: Twilio si échec
```

### Monitoring

**CloudWatch:**
- Logs aggregation
- Metrics custom (ventes, conversions)
- Alarms (erreurs, latence)

**X-Ray:**
- Distributed tracing
- Performance analysis

---

## 🔧 Outils Développement

### Version Control

```bash
Git + GitHub
  - Branches: main, develop, feature/*
  - Pull Requests obligatoires
  - Reviews avant merge
```

### CI/CD

```yaml
GitHub Actions:
  - Lint & Tests sur PR
  - Build Docker image
  - Deploy ECS (main branch)
  
Environnements:
  - dev: auto-deploy (develop branch)
  - staging: manual approve
  - production: manual approve
```

### Local Development

```yaml
Docker Compose:
  - PostgreSQL container
  - Redis container
  - Backend (hot-reload)
  - Frontend (Vite dev server)
  
Commande:
  docker-compose up -d
```

---

## 📦 Gestion Dépendances

### Node.js Packages

**Lock files:**
- `package-lock.json` (npm)
- Commités dans Git
- Installations reproductibles

**Audit sécurité:**
```bash
npm audit
npm audit fix
```

**Updates:**
```bash
# Check outdated
npm outdated

# Update patch versions
npm update

# Update major (careful!)
npm install package@latest
```

---

## ✅ Checklist Stack

Avant développement:

```yaml
✅ Frontend:
  - [ ] React 18 + TypeScript configuré
  - [ ] Vite build tool setup
  - [ ] TailwindCSS + Headless UI installés
  - [ ] React Query pour API calls
  - [ ] Zustand pour state local

✅ Backend:
  - [ ] NestJS 10 + TypeScript configuré
  - [ ] TypeORM + PostgreSQL connecté
  - [ ] Architecture hexagonale comprise
  - [ ] JWT auth implémenté
  - [ ] Swagger docs auto

✅ Database:
  - [ ] PostgreSQL 15 local (Docker)
  - [ ] Schemas séparés par module
  - [ ] Migrations TypeORM setup
  - [ ] Redis cache configuré

✅ AWS:
  - [ ] Compte créé (Free Tier)
  - [ ] IAM user avec permissions
  - [ ] S3 bucket images créé
  - [ ] SES vérifié (email domaine)

✅ Outils:
  - [ ] Git + GitHub repo
  - [ ] Docker Desktop installé
  - [ ] VS Code + extensions
  - [ ] Postman/Insomnia API tests
```

---

**Prochaine lecture:** `02-api-contract.md` pour la spécification des endpoints REST.
