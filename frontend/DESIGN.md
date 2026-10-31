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
