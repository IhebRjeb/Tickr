# Phase 7 — Design System

| Field | Value |
| --- | --- |
| **Phase** | 7 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | ⬜ To Do |
| **Owner** | Design System |

> **Objective:** Define foundations as **TailwindCSS 4-consumable tokens** so implementation is copy-paste, not re-interpretation. Target **WCAG 2.1 AA**.

---

## 1. Color Palette
_Define semantic tokens (not just raw hexes). Verify contrast for text and interactive elements._

| Token | Value | Usage | Contrast checked |
| --- | --- | --- | --- |
| `--color-primary` | | brand / CTAs | ☐ |
| `--color-primary-fg` | | text on primary | ☐ |
| `--color-surface` | | cards / panels | ☐ |
| `--color-bg` | | page background | ☐ |
| `--color-muted` | | secondary text | ☐ |
| `--color-success` | | success states | ☐ |
| `--color-warning` | | warnings | ☐ |
| `--color-danger` | | errors / destructive | ☐ |

## 2. Typography
| Token | Font / size / line-height | Usage |
| --- | --- | --- |
| `text-display` | | hero |
| `text-h1..h4` | | headings |
| `text-body` | | body |
| `text-caption` | | meta |

- Font family (Latin + Arabic support if needed):

## 3. Spacing, Radius, Elevation
- Spacing scale (e.g. 4/8/12/16/24/32…):
- Radius scale (sm/md/lg/full):
- Shadow / elevation tokens (0–4):

## 4. Grid & Breakpoints
- Container widths:
- Breakpoints: `sm` / `md` / `lg` / `xl` (align with Tailwind defaults or override):

## 5. Iconography
- Library: **@heroicons/react** (outline/solid usage rules).

## 6. Motion
| Token | Value | Usage |
| --- | --- | --- |
| `duration-fast` | | micro-interactions |
| `duration-base` | | transitions |
| `ease-standard` | | default easing |

- Respect `prefers-reduced-motion`.

## 7. Accessibility
- [ ] Text contrast ≥ 4.5:1 (AA), large text ≥ 3:1
- [ ] Interactive elements ≥ 3:1 against adjacent colors
- [ ] Visible `:focus-visible` on all interactive elements
- [ ] Full keyboard navigation
- [ ] Responsive breakpoints validated

## 8. Token Export
_Tokens must be exportable to the Tailwind theme (CSS variables / `@theme`). Reference the file where tokens will live: `frontend/src/styles/*`._

```css
/* Example: frontend/src/styles/tokens.css (@theme) */
@theme {
  --color-primary: /* … */;
  --radius-lg: /* … */;
  --duration-base: /* … */;
}
```

---

## Acceptance Criteria
- [ ] All foundations tokenized and Tailwind-consumable
- [ ] Contrast verified (AA) for text and interactive elements
- [ ] Focus states, keyboard nav, and breakpoints defined
- [ ] Tokens exportable to the Tailwind config
