---
name: fluxo-ui-design
description: "Design, implement, or review interfaces for the Fluxo ERP. Use for dashboards, CRM workflows, login, registration, forms, charts, responsive layouts, visual design systems, and accessibility. Applies the project's Awwwards/Dribbble inspiration without copying reference artwork."
argument-hint: "Describe the Fluxo screen, workflow, or design issue to work on"
user-invocable: true
---

# Fluxo UI Design

Create coherent, production-minded interfaces for Fluxo, a Portuguese-language ERP that connects Comercial, Financeiro, RH, and management in one demand lifecycle.

## Design intent

Use the visual direction of a focused CRM workspace with a product-specific identity:

- **Operational core:** clear dashboard hierarchy, compact but readable data, visible status, quick scanning, and predictable actions.
- **Product identity:** add a restrained narrative moment to sign-in, onboarding, empty states, or workflow introductions. The story supports the task; it must not obstruct the ERP.
- **AI-assistant reference:** treat an assistant as an optional contextual workspace, not a generic chat bubble or a reason to add unrequested AI behavior. Keep the principal data and next action visible.
- **Workflow:** make handoffs between Comercial → Financeiro → RH explicit, with history attached to the same demand.
- **Language:** all user-facing copy is Brazilian Portuguese. Use concise labels, real task language, and complete error/success feedback.

References are inspiration, not implementation specifications. Do not copy their artwork, exact composition, text, branded assets, or pixel-level layout. Read [reference notes](./references/inspiration.md) before materially changing the product-wide visual direction.

## Required workflow

1. **Understand the task**
   - Identify the user, role, device, page, primary task, and relevant workflow state.
   - Inspect the existing page and components before designing. Reuse shared patterns and respect authorization boundaries.
   - Confirm whether the requested work is visual, behavioral, or both. Do not invent AI, account, or business capabilities from a visual reference.
2. **Choose a coherent direction**
   - Use a focused product/style rationale before picking colors, type, layout, and effects.
   - Prefer the existing Fluxo design tokens in `frontend/DESIGN.md`; update the source of truth when intentionally changing the system.
   - Keep the distinction between an expressive entry point and a calm, task-oriented workspace.
3. **Design the complete state**
   - Cover loading, empty, success, error, disabled, and permission-denied states where relevant.
   - Make each workflow step and its responsible area explicit. Never rely on color alone for status.
   - Give forms visible labels, useful constraints, inline validation, and a clear submission result.
4. **Implement in the current stack**
   - Inspect the existing React + TypeScript + Vite code and use its components, Lucide icons, CSS patterns, and API services.
   - Keep components focused, typed, keyboard-operable, and responsive. Avoid new dependencies unless necessary.
   - Use SVG icons, not emoji; keep icon stroke, size, and alignment consistent.
   - Use semantic CSS variables from `frontend/DESIGN.md`, not one-off colors scattered through components.
5. **Verify**
   - Run the smallest relevant build/type/lint check.
   - Test the actual interaction with browser tools when available, including both success and failure.
   - Check a narrow viewport (at least 375px), keyboard navigation, visible focus, and reduced-motion behavior.
   - Report any reference or browser that could not be visually inspected; do not present inference as observation.

## Quality bar

- Body text should remain readable (normally at least 14–16px for primary copy); secondary metadata must still be legible and contrast-compliant.
- Maintain WCAG AA text contrast (4.5:1 for normal text; 3:1 for large text and meaningful non-text controls).
- Interactive controls need a visible focus ring, accessible name, disabled/loading feedback, and a usable pointer target. Do not depend on hover.
- Preserve zoom, support keyboard and password managers, and associate errors with the relevant field.
- Use an 8px spacing rhythm, consistent border radii, and one primary action per form or decision step.
- Charts and status badges need text, labels, or legends; color is supplementary.
- Motion is brief and purposeful. Honor `prefers-reduced-motion`; do not add scroll choreography to operational screens.
- No invented metrics, fake success states, hardcoded user credentials, or personal data in fixtures.
- Dashboard visual polish must not compromise data density, permissions, audit history, or performance.

## Project-specific constraints

- Follow `IA/general.md`, `IA/security.md`, and `frontend/DESIGN.md`.
- The backend is authoritative for authorization and validation; hiding a UI control is not access control.
- Never put service-role keys, JWT secrets, or private credentials in client code or committed files.
- Treat reference pages as inspiration only and respect their authorship and branding.

## Delivery summary

State which screens/states changed, what was verified, and any remaining dependency (for example a reference inaccessible to the browser or a backend service not configured). Link the relevant workspace files.
