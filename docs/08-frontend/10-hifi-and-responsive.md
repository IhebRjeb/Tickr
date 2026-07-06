# Phases 9 & 10 — High-Fidelity Designs, Responsive & Prototype

| Field | Value |
| --- | --- |
| **Phases** | 9 (Hi-Fi) & 10 (Responsive + Prototype) of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | ⬜ To Do |
| **Owner** | Product Design |

> **Objective:** Apply the design system (Phase 7) to all wireframes (Phase 8) to produce high-fidelity mockups, define responsive behavior (mobile/tablet/desktop), and deliver one interactive prototype of the core purchase flow.

---

## Phase 9 — High-Fidelity Designs

### Workflow (AI-assisted, manual review mandatory)
```
ChatGPT → Figma Make → Figma Agent → Claude + Figma MCP → Manual Design Review → Interactive Prototype
```
Every screen passes a **manual design review** before acceptance.

### Hi-Fi tracking
| Screen | Hi-Fi link | Manual review |
| --- | --- | --- |
| Landing | | ☐ |
| Event Details | | ☐ |
| Checkout & Payment | | ☐ |
| Ticket + QR | | ☐ |
| Organizer Dashboard | | ☐ |
| Event Analytics | | ☐ |
| _…all remaining Phase 4 screens_ | | ☐ |

---

## Phase 10 — Responsive Design & Prototype

### Responsive specs
| Breakpoint | Target | Notes |
| --- | --- | --- |
| Mobile | ~360–430px | primary (mobile-first) |
| Tablet | ~768px | layout adjustments |
| Desktop | ≥1024px | organizer/admin dense views |

- Per-screen responsive notes (what reflows, what hides, nav pattern change: `BottomNav` ↔ `Sidebar`).

### Interactive prototype
- **Core flow:** participant purchase — discover → event → reserve → checkout → pay → ticket.
- Must include **at least one failure branch** (sold out `409` or payment failed).
- Prototype link:

---

## Acceptance Criteria
- [ ] Hi-fi mockups cover all Phase 4 screens
- [ ] Manual design review passed for every screen
- [ ] Responsive specs for mobile / tablet / desktop
- [ ] Interactive prototype of the purchase flow, including a failure branch
