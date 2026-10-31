---
name: Fluxo Operations Ledger
colors:
  primary: "#1F1F1F"
  on-primary: "#FFFFFF"
  secondary: "#F6F7ED"
  on-secondary: "#1F1F1F"
  tertiary: "#5276D9"
  surface: "#F3F2EE"
  surface-container: "#FFFFFF"
  on-surface: "#1F1F1F"
  on-surface-variant: "#5F625F"
  outline: "#E3E4DF"
  error: "#A3444A"
  status-pending: "#8B641D"
  status-complete: "#28745E"
  status-blocked: "#A3444A"
  focus-ring: "#5276D9"
  chart-primary: "#6974EF"
  chart-secondary: "#FF6534"
  chart-tertiary: "#51B5D5"
  chart-neutral: "#A8ADBB"
typography:
  display-lg:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
  headline-md:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
  title-md:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
  label-sm:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.4
spacing:
  unit: 8px
  page-gutter: 40px
  card-gap: 16px
rounded:
  control: 12px
  card: 20px
  dialog: 22px
---

## Overview

Fluxo is an integrated CRM/ERP workspace for a Brazilian services company. Its operational center should feel like a clear CRM dashboard: stable navigation, scannable records, explicit statuses, and a visible next step across Comercial, Financeiro, and RH. The entry experience may use a restrained product story to make that journey memorable, but daily work remains calm, fast, and information-first. Apply a single consistent system to sign-in, registration, approvals, and dashboards.

## Colors

The palette pairs warm paper surfaces with ink-like text and a restrained periwinkle accent, reflecting the supplied retail and financial dashboard references without copying their artwork. A vivid orange `#FF4C20` highlights the brand icon; the leading demand KPI uses the darker orange `#D93812` for readable white labels. Financial chart bars use periwinkle and orange gradients; workflow stage colors remain consistent across the volume chart and distribution legend. **Primary** `{colors.primary}` is reserved for the main action; the pale olive-neutral `{colors.secondary}` supports selected surfaces. **Tertiary** `{colors.tertiary}` marks interactive emphasis and healthy states, always alongside readable text. **Surface** `{colors.surface}` is the page canvas; `{colors.surface-container}` is the work surface. Use `{colors.on-surface}` for important content and `{colors.on-surface-variant}` for supporting text. `{colors.outline}` is for separators and control boundaries, while `{colors.error}` is reserved for errors and destructive actions.

Statuses must include text labels; color alone never carries meaning. Maintain WCAG AA contrast for normal text.

## Typography

Use a system sans-serif stack for predictable rendering without a remote font request. Keep one family throughout, using Inter when available locally and Segoe UI/Arial as fallbacks. Large page titles and account names use a lighter weight and tight letter spacing; numerical KPIs are prominent. Headings use a restrained semibold/bold hierarchy; body copy stays readable and compact. Use tabular numerals for currency and counts when available. Uppercase is for short section metadata only, never paragraphs or user data.

## Layout

An 8px rhythm organizes the workspace. Use centered horizontal navigation below the header and a clear dashboard content area. On narrow screens, use icon buttons with accessible names and horizontal scrolling inside the navigation only; preserve readable records without page-wide horizontal scroll. The overview dashboard uses actual demand counts by workflow stage, total budget, and invoiced values. Do not imply time trends until historical reporting data exists. Group each demand's code, client, status, and value for quick scanning. The approval sequence must read in order: Comercial, Financeiro, then RH. Forms should stay short, label every field, and show validation beside the relevant action. A future assistant panel, if approved as a product capability, must be contextual and must not hide the underlying demand or action.

## Elevation & Depth

The dashboard uses a warm neutral canvas, rounded white work surfaces, subtle boundaries, and generous internal spacing. Financial bars may use restrained gradients inspired by the supplied analytics reference. The profile cover may use abstract gradients; the login uses an original local vector coastal illustration behind an opaque dark form. Soft shadows are appropriate for the login, profile, and dialogs. Focus rings carry interaction state. Keep operational data free of decorative imagery.

## Shapes

Use consistent soft radii: 12px for controls, 20px for dashboard cards, and 22px for dialogs. The profile uses a 30px outer shell and a circular overlapping avatar. Login actions and role labels may use pill shapes, following the supplied references. Status badges remain compact rounded rectangles. Icons are simple outline symbols and never replace a text label.

## Components

- **Login and registration:** Center a compact dark account card over the original local coastal illustration (`public/fluxo-landscape.svg`). Use clear light labels, dark inputs, a light primary button, and visible login/registration switching. On wide screens an external caption introduces the three-area workflow; hide that caption on narrow screens. Preserve approval information, validation, password-manager support, loading, and pending-review feedback. Do not invent social sign-in or copy reference artwork.
- **Navigation:** Use a centered horizontal bar below the sticky header, with dark selected destination, outline icons, and labels on wide screens. Use icon buttons with accessible names on smaller screens. Keep authorized page search and sign-out as separate controls at the end of the bar. Search reveals only permitted destinations and offers an explicit empty state. Preserve keyboard access, visible focus, and local horizontal scrolling when necessary. There is no lateral drawer or expand/collapse control.

- **Profile:** Keep the existing abstract cover, overlapping avatar, user name, role badge, and actual email, department, access level, and account state. Allow users to upload their own JPG/PNG/WebP photo (up to 5 MB), cropped centrally and re-encoded as a 384px JPEG. Show loading, success, and errors beside the photo control; update the header avatar only after upload succeeds. Store photos in the private `profile-avatars` bucket with own-account policies and signed URLs. Fall back to initials when no photo is available. Never store photo bytes in JWT metadata or browser storage. Do not invent ratings, earnings, skills, or contact actions.
- **Account identity:** Keep the signed-in user's avatar, name, and role visible in the top-right header and make that control open a compact profile dialog aligned under the header. Preserve the full profile page in horizontal navigation. Keep sign-out separate at the end of the navigation bar. The dialog closes with Escape, its close button, or a backdrop click and uses the native dialog focus behavior.
- **Operations analytics:** Follow the retail reference hierarchy: four KPI cards above a broad budget/invoice chart, two readable supporting panels at the right, and recent demands below. Use a vivid orange leading KPI, a muted neutral secondary card, and white financial cards. Give the distribution chart sufficient room for its total and labels. At narrow widths stack panels, retain two KPI columns, and scroll only the records table horizontally. Use recorded values grouped by workflow stage; never invent periods, percentage changes, expenses, or forecasts.
- **Pending account approvals:** Show the requester's name, email, submission date, and an explicit role selector. Approval assigns the role; a registrant cannot choose their own access level.
- **Demand cards:** In the dashboard pipeline, show code, client, status, and currency in scannable cards; keep the shared audit history available from each card.
- **Workflow actions:** Label each action with its destination, such as “Aprovar proposta e enviar ao Financeiro”; never rely on an unlabeled icon.
- **Feedback:** Use visible text for errors, successful submission, and pending review. Disable submission while a request is in progress.

## Do's and Don'ts

- Do use Portuguese for all user-facing copy.
- Do show the approval state and responsible department as text.
- Do keep one primary action per form or decision step.
- Do preserve the same spacing and surface rules on the login and registration views.
- Don't grant a role or active account during public self-registration.
- Don't use WebGL, scroll choreography, glass effects, or decorative graphics behind operational data. Restrained chart gradients, a profile cover, and the illustrated entry screen are intentional reference-led exceptions.
- Don't encode access, success, or errors using color alone.
- Don't expose pending users' passwords, hashes, or other authentication data in API responses.

## Current reference implementation

The user's four latest supplied images take visual precedence over earlier style constraints. The retail dashboard guides composition, the financial dashboard guides rounded surfaces and chart polish, the dark landscape login guides the entry screen, and the profile cards guide the cover/avatar hierarchy. Existing access rules and truthful metrics remain mandatory.

`src/reference-layout.css` is the dedicated visual override layer, imported after the existing `styles.css` to preserve existing workflow and form styling. `src/components/DataVisualization.tsx` owns chart gradients and derives instance-unique SVG IDs with React `useId`. Chart animation is disabled, and CSS honors reduced motion. The original coastal SVG is served locally without external requests.

The compact header profile preserves the full card composition at a maximum width of 460px, including the existing cover, overlapping avatar, photo action, and two-column account details. Native close events must ignore a queued effect-cleanup close when StrictMode has already reopened the dialog.

## Navigation motion

The horizontal bar stays centered below the header. On destination changes, the content enters with a 240ms fade and 8px vertical translation. Buttons use brief hover/press feedback, selected icons settle over 220ms, and the profile dialog enters over 180ms. All motion is disabled with `prefers-reduced-motion`. Re-rendering data within a page does not replay page navigation animation.

## Collaboration and written reviews

The authorized `Conversas` destination holds a general cross-sector conversation and restricted Financeiro/RH channels. Each demand has the same scoped conversation in its expanded details. Messages have author, department, timestamp, and type (message, analysis, or pending question); the latter is a record category, not a tracked task state. The shared channel is visibly labeled as readable by all active accounts. Restricted messages remain protected by database policies, never only by hidden tabs.

Review forms collect a written opinion (10–4000 characters) before forwarding a demand, alongside the existing financial or staffing fields. The new RPC stores the opinion and transition atomically, retaining workflow triggers. Commercial opinions are shared; financial and HR opinions stay in their restricted channels. The audit history remains separate from the immutable conversation records.

Conversations poll every 15 seconds while visible, offer manual refresh and older-message pagination, and retain composer text after send failures. They show loading, empty, sending, permission, and setup error states without fake messages. There are no direct messages, attachments, read receipts, notification badges, or claimed instant delivery. Communication requires `20261031010000_sector_communication.sql` in Supabase.

The full profile page fills the available content width without a separate card-width limit. The header profile dialog retains its compact width.

## Light and dark themes

The header and login expose an accessible sun/moon theme toggle. On first use, follow the system color scheme. An explicit choice persists in `localStorage` under `fluxo.theme`; synchronize changes between tabs. If storage is unavailable, switching still works for the current page. Apply the initial preference before rendering the app.

`src/theme.css` defines dark surfaces, readable text, form controls, status badges, conversation panels, profile cards, dialogs, and chart tooltip/axis/grid colors. The existing profile banner and illustrated login retain their authored visual identity. Theme colors must not replace status labels, role checks, or focus indicators. No account or database migration is required.

## People and allocation workspace

Pessoas & RH has three sections: Equipe, Alocações, and Demandas recebidas. RH and Administração can manage the roster and allocations; Gerência has read-only access. Comercial and Financeiro cannot read these tables. Employees are operational records, independent of authentication accounts, and contain only name, job title, skills, availability capacity, and active state.

Capacity can be 100%, 50%, or 0%. The displayed free capacity subtracts active allocations on the current business date in America/Cuiaba. A missing database configuration shows a setup error and unknown staffing totals rather than fabricated zero counts. Forms work independently of receiving demands.

Allocations bind a named person to a demand awaiting RH, with function, inclusive start/end dates, and dedication percentage. The database serializes changes per employee and checks peak cumulative load throughout the proposed interval; sequential work is not treated as simultaneous. Disallow overlapping duplicate bookings on the same demand, unavailable employees, and capacity reductions below reserved load. Preserve completed/cancelled bookings, and require a reason to cancel an open booking. Allocation/cancellation events enter the existing RH-scoped demand history.

Demandas recebidas reuses the existing demand card, conversation, and audit-history controls. RH confirms named allocations with a written opinion; a dedicated RPC derives the distinct person count/functions and calls the existing transactional handoff. The previous count is a snapshot at confirmation; later cancellations are tracked in allocations and history. The Commercial and Financial review forms and transition functions are not changed.

The new feature requires only `20261031020000_people_allocation.sql` after the prior migrations. No production release or database migration is performed as part of local interface development. Staffing-specific styles inherit theme tokens and adapt forms, summary cards, and records to narrow screens.

## Finance workspace

Financeiro now has Visão financeira, Revisões, Contas a receber, and Contas a pagar. Preserve the existing demand review card, forms, audit history, and Commercial → Financial → HR transitions; account bookkeeping never changes a demand's workflow stage. Financeiro and Administração manage accounts; Gerência has read-only access. Comercial and RH cannot read ledger entries or financial-entry events.

The dashboard separates recorded receipts/payments from budget, invoiced values, and estimates. Realized totals use settlement dates inside the selected inclusive period. The result is receipts minus payments, not a bank balance. Outstanding commitments and overdue counts explicitly cover all due dates. Actual monthly movements, overdue accounts, and upcoming due dates use only recorded entries. Unknown totals use dashes while configuration/data is unavailable.

Accounts accept description, customer/supplier, exact total cents, first due date, 1–60 monthly installments, an optional demand link, and notes. End-of-month dates are clamped independently from the original first due date; installment cents sum exactly to the total. Each form retains a request UUID for retry-safe creation. Do not automatically generate commitments from a demand's invoiced value or infer actual receipts from its approval.

Settlement is a manual, full-value confirmation per installment with a nonfuture effective date. The interface does not initiate bank transfers or support partial payments, bank reconciliation, or reversal of settled records. Open accounts can be cancelled with a reason, without deleting historical records. Creation, settlement, and cancellation generate immutable financial audit events and Financial-scoped demand history where linked. All mutations are transactional, authorized and validated server-side.

This addition requires `20261031030000_finance_dashboard.sql`. Existing revisions remain usable even if the new ledger is not configured. Component boundaries: `FinancePage` routes financial sections, `FinanceOverview` renders recorded totals, `FinanceForms` manages account actions, `services/finance.ts` handles requests, and `utils/finance.ts` contains pure cent/date/aggregation logic.
