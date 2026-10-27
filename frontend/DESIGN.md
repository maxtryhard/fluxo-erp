---
name: Fluxo Operations Ledger
colors:
  primary: "#1F1F1F"
  on-primary: "#FFFFFF"
  secondary: "#F6F7ED"
  on-secondary: "#1F1F1F"
  tertiary: "#5276D9"
  surface: "#F4F4F2"
  surface-container: "#FFFFFF"
  on-surface: "#1F1F1F"
  on-surface-variant: "#5F625F"
  outline: "#E3E4DF"
  error: "#A3444A"
  status-pending: "#8B641D"
  status-complete: "#28745E"
  status-blocked: "#A3444A"
  focus-ring: "#5276D9"
  chart-primary: "#6277DC"
  chart-secondary: "#EE9B42"
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
  control: 6px
  card: 9px
  dialog: 12px
---

## Overview

Fluxo is an integrated CRM/ERP workspace for a Brazilian services company. Its operational center should feel like a clear CRM dashboard: stable navigation, scannable records, explicit statuses, and a visible next step across Comercial, Financeiro, and RH. The entry experience may use a restrained product story to make that journey memorable, but daily work remains calm, fast, and information-first. Apply a single consistent system to sign-in, registration, approvals, and dashboards.

## Colors

The palette pairs warm paper surfaces with ink-like text and a restrained periwinkle accent, reflecting the supplied CRM and dashboard references without copying their artwork. **Primary** `{colors.primary}` is reserved for the main action; the pale olive-neutral `{colors.secondary}` supports selected surfaces. **Tertiary** `{colors.tertiary}` marks interactive emphasis and healthy states, always alongside readable text. **Surface** `{colors.surface}` is the page canvas; `{colors.surface-container}` is the work surface. Use `{colors.on-surface}` for important content and `{colors.on-surface-variant}` for supporting text. `{colors.outline}` is for separators and control boundaries, while `{colors.error}` is reserved for errors and destructive actions.

Statuses must include text labels; color alone never carries meaning. Maintain WCAG AA contrast for normal text.

## Typography

Use a system sans-serif stack for predictable rendering without a remote font request. Keep one family throughout. Headings use a restrained semibold/bold hierarchy; body copy stays readable and compact. Use tabular numerals for currency and counts when available. Uppercase is for short section metadata only, never paragraphs or user data.

## Layout

An 8px rhythm organizes the workspace. On desktop, use stable light navigation and a clear dashboard content area; on narrow screens, collapse navigation into a drawer and preserve readable records without forcing page-wide horizontal scroll. The overview dashboard uses actual demand counts by workflow stage, total budget, and invoiced values. Do not imply time trends until historical reporting data exists. Group each demand's code, client, status, and value for quick scanning. The approval sequence must read in order: Comercial, Financeiro, then RH. Forms should stay short, label every field, and show validation beside the relevant action. A future assistant panel, if approved as a product capability, must be contextual and must not hide the underlying demand or action.

## Elevation & Depth

The dashboard uses a restrained layered workspace: warm neutral canvas, white work surfaces, and hairline borders. Reserve a soft shadow for dialogs; avoid blur, glow, and decorative gradients. Focus rings and clear borders carry interaction state. Product storytelling belongs in a dedicated entry or onboarding moment, not as decoration behind operational data.

## Shapes

Use consistent small radii: 6px for controls, 9px for cards, and 12px for dialogs. Status badges may be compact rounded rectangles; avoid mixing pills with sharp geometry elsewhere. Icons are simple outline symbols and never replace a text label.

## Components

- **Login and registration:** Use a calm split layout: a centered account form on the left and a soft, grid-textured panel on the right that explains the real Comercial → Financeiro → RH handoff. Keep the form on a clear surface, show the approval requirement before submission, and use one primary action. Do not invent testimonials, social sign-in, or copy reference artwork.
- **Navigation:** Keep a light sidebar with a compact workspace identity, an accessible search field for authorized destinations, clearly titled groups for workspace, operations, administration, and account, a high-contrast active item, meaningful live counts, and profile/sign-out controls in the footer. Search filters only destinations the current role may access and offers an explicit empty state.
- **Operations analytics:** Use responsive, keyboard/readout-friendly charts for budget and recorded invoices grouped by current workflow stage, plus demand-volume distribution. Label chart categories and keep totals visible; do not invent month-over-month changes, expenses, revenue forecasts, or transaction counts.
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
- Don't use WebGL, scroll choreography, gradients, glass effects, or decorative graphics in operational dashboard screens.
- Don't encode access, success, or errors using color alone.
- Don't expose pending users' passwords, hashes, or other authentication data in API responses.
