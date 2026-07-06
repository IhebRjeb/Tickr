# 📚 Frontend Design & Architecture — Deliverables Index

This folder is the **single source of truth** for the Tickr frontend design and architecture foundation, produced by the Epic **[FRONTEND] Define Frontend Plan & Design Direction**.

Each document maps to a phase of the Epic. Do not start React implementation until every deliverable below is marked ✅.

| # | Phase | Document | Status |
| --- | --- | --- | --- |
| — | Epic | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) | 🚧 In progress |
| 1 | Product Design Brief | [02-product-design-brief.md](02-product-design-brief.md) | ⬜ To Do |
| 2 | Information Architecture | [03-information-architecture.md](03-information-architecture.md) | ⬜ To Do |
| 3 | User Journey Mapping | [04-user-journeys.md](04-user-journeys.md) | ⬜ To Do |
| 4 | Screen Inventory | [05-screen-inventory.md](05-screen-inventory.md) | ⬜ To Do |
| 5 | Feature Inventory | [06-feature-inventory.md](06-feature-inventory.md) | ⬜ To Do |
| 6 | Component Inventory | [07-component-inventory.md](07-component-inventory.md) | ⬜ To Do |
| 7 | Design System | [08-design-system.md](08-design-system.md) | ⬜ To Do |
| 8 | Low-Fidelity Wireframes | [09-wireframes.md](09-wireframes.md) | ⬜ To Do |
| 9–10 | Hi-Fi, Responsive & Prototype | [10-hifi-and-responsive.md](10-hifi-and-responsive.md) | ⬜ To Do |
| 11 | Frontend Architecture | [11-frontend-architecture.md](11-frontend-architecture.md) | ⬜ To Do |

## Conventions

- **Roles:** `PARTICIPANT`, `ORGANIZER`, `ADMIN`.
- **API base:** `/v1` — see the endpoint reference in the Epic doc, §6.
- **Payment gateways:** Konnect (primary TN), Paymee (TN fallback), Stripe (international).
- **Currency:** TND. **Commission:** configurable (default 6%) via `GET /config/public`.
- **Stack:** Next.js 16 (App Router) · React 19 · TailwindCSS 4 · TanStack Query · axios · react-hook-form + zod · zustand · Headless UI. Tests: Vitest + Playwright.

Every deliverable must trace back to a real backend endpoint or an explicitly static page.
