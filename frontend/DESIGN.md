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
- **Navigation:** Use a centered horizontal bar below the sticky header, with outline icons, circular buttons, and a sliding capsule for the selected destination. Show destination names on hover and keyboard focus; retain accessible names at every viewport size. Keep authorized page search and sign-out as separate controls at the end of the bar. Search reveals only permitted destinations and offers an explicit empty state. Preserve keyboard access, visible focus, and local horizontal scrolling when necessary. There is no lateral drawer or expand/collapse control.

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

## Capsule navigation reference

The latest user reference introduces a compact dark pill with circular icon controls and a wider selected capsule. Fluxo uses its own orange `#FF6534` selection on light pages and pale periwinkle `#C5CAFF` on dark pages, with dark readable active icons. Preserve centered placement, existing destinations, authorized-page filtering, account access, search and sign-out. Do not add destinations from the reference.

`components/NavigationDock.tsx` wraps the existing authorized buttons and measures the selected button for a sliding indicator. The indicator updates after resizing and filtering; changing destinations reveals an offscreen selected button within the mobile scroll container. Names appear above the bar on mouse hover or keyboard focus. The icon button's accessible name remains available to screen readers.

`src/navigation-dock.css`, loaded after the theme stylesheet, owns the capsule palette and shape. Controls remain at least 44px. On narrow viewports, horizontal scrolling is confined to the dock; the page does not overflow. Reduced-motion users get immediate state changes without animated movement.

## Nested panel contrast

Detail sections must pair their text and background through theme tokens. `--panel-muted` is a pale surface in light mode and a dark inset in dark mode. Demand descriptions use 14px body text; statuses and metadata remain at least 12px. Demand codes, monetary values, pending-user details, chart totals/legends, history text, and input placeholders must use readable theme-aware colors. Links use `--link-color` and `--link-hover`, never a fixed pale color on white.

The contrast repair was checked in Chrome against 34 representative text/background pairs (demand details, metadata, conversation, inputs, pending accounts, and chart labels), in both themes and at 375px. The lowest measured ratio was 4.81:1 in light mode and 7.46:1 in dark mode. These measurements cover the tested samples, not an exhaustive audit of every application state. No SQL or access-control change is needed.

## Conheça o Fluxo

The header's Como usar control opens an educational guide, inspired by the user-supplied feature mosaic and stacked expandable-card references. Use a four-column bento on wide screens, two columns at medium widths and one on mobile; the workflow and conversation cards span available columns to avoid empty cells. Dark workflow, warm financial and periwinkle people cards use the existing palette. Illustrations are code-native icons and abstract decorations, without copied artwork or fictional operational data.

The six topics explain the complete workflow, Commercial, Finance, People/RH, Demands and Conversations. Selecting a card reveals readable steps, permission context and a shortcut only when the existing navigation authorizes that destination. Static explanations do not fetch or reveal account-specific operational data. The dialog supports keyboard navigation, Escape, visible focus, backdrop dismissal and reduced motion, including React StrictMode reopening behavior.

A dismissible inline invitation appears on Overview until opened or dismissed in that browser. Only the non-sensitive invitation preference is saved (`fluxo.guide.invitation.v1`); the guide remains available from the header. No automatic recurring modal, operational notification service, or new database capability is introduced.

Manual editing: `content/systemGuide.ts` owns explanatory text and steps, `components/SystemGuide.tsx` owns behavior, and `system-guide.css` owns layout and colors. Existing destination authorization remains in App.tsx and backend/bank policies. No SQL migration is required.

The public entry now pairs a system presentation with the authentication card on the right at desktop widths. At 900px and below, the card follows the presentation and remains reachable through the header access link. Taller registration forms retain page scrolling on short screens.

### Guided navigation tour

Como usar also offers Iniciar tour guiado; Ver na prática starts a single-sector tour. `content/systemTour.ts` supplies ordered steps filtered by existing authorized destinations. `GuidedTour.tsx` lazily opens a native modal dialog with a numbered spotlight, explanation, progress and Back/Next/Finish/Exit controls. Escape exits and focus returns to Como usar. Only page navigation and explicit safe tab selectors are activated; no form submission, approval, allocation, settlement or conversation send occurs.

Targets use stable `data-tour` attributes. Highlight geometry updates on scrolling, resizing and relevant content changes. Missing targets show a recoverable message and navigation remains available. Small screens retain a viewport-contained bubble; reduced-motion preferences disable progress transitions. The guide uses real screens and existing empty/error/loading states, without inserting demonstration business records. Existing operational reads and backend permissions remain unchanged. No SQL is required.

Manual maintenance: edit step copy/order/selectors in `content/systemTour.ts`, overlay behavior in `components/GuidedTour.tsx`, and visual styles in `guided-tour.css`. Keep automatic actions limited to known tab buttons. Browser validation covers actual App navigation with simulated authentication/data, all Admin steps, Commercial filtering, safe tab switching, back/next/completion, sector-only launch, Escape and mobile layout in both themes. No live Supabase data is changed by these tests.

## Public landing page and separate access screens

The public initial screen is a landing page, as clarified by the user. It contains a centered hero explaining Fluxo, prominent registration/login links, a spacious feature stage, and a footer. Do not embed an authentication form beside or below the hero. Header links and hero CTAs open dedicated access screens.

`routing/routes.ts` defines public paths (`/`, `/entrar`, `/cadastro`) and protected module paths. `routing/browser.ts` uses the History API for navigation, Back/Forward and compatibility with old public hash links. `components/PublicEntry.tsx` renders the selected public screen. Deep links on Vercel use `frontend/vercel.json` (project Root Directory `frontend`). Module authorization and visible navigation share one policy; the database remains authoritative. The authentication form is remounted when its mode changes, discarding password field state. Existing login, registration and administrative approval remain in place. See `docs/ROUTING_ACCESS.md`.

`components/ProductPresentation.tsx` owns the hero copy, CTAs, four sector tabs and original CSS/SVG illustrations. Match the supplied video's composition: a compact centered hero, a spacious soft gradient stage, small floating icon tabs joined to a selected card, explanatory copy on the left and a sector illustration on the right. Illustrative windows contain no actual amounts, identities or operational records. The feature stage expands with native page scrolling, stays pinned while sectors change, then contracts and releases into the next section. It is not a modal. There is no wheel interception, body-scroll lock, autoplay or external video. Login links open the separate login screen.

`components/LoginScreen.tsx` owns only the login/registration form, feedback and return link. `entry-page.css` owns public layouts and theme pairs. Access forms are centered on their own screen at every width. Controls remain usable on small screens and primary inputs use 16px text on mobile. Keyboard tabs, arrows/Home/End, visible focus and reduced-motion behavior remain supported.

The implementation adds no external fonts, images, libraries or continuous animation. Gradients use CSS and tab transitions use brief opacity/transform effects. Scroll geometry is updated through CSS variables in a coalesced animation frame; React state changes only when a sector boundary is crossed. FinancePage, PeoplePage, chart and tour bundles stay deferred. Database permissions and Supabase configuration remain unchanged; no SQL is needed.

Verified in Chrome at 320, 375, 768, 1024 and 1440px in both themes: landing contains no forms; both sets of CTAs reach separate access pages; mode switching, return, browser history, direct links and reload work; feature-stage access reaches login; pages do not overflow horizontally. Login/registration error and success states are checked using mocked callbacks instead of real account creation. These checks describe tested environments, not a guarantee for all hardware or connections.

Preserve the reference's presentation hierarchy explicitly: header/navigation and access actions, centered headline and supporting copy, paired access CTAs, broad gradient feature stage, a second centered explanatory heading/CTA, then four compact workflow cards. `WorkflowPresentation` explains Comercial, Financeiro, Pessoas e RH and Acompanhamento with real Fluxo capabilities. The below-stage section should remain distinct from the interactive card, with generous separation and a four/two/one-column responsive grid. Home header section links scroll within the landing; login/register links still open their dedicated screens.

### Scroll behavior and plain public copy

`ScrollPresentation.tsx` owns a 200svh scene with a sticky viewport-height frame. The first quarter of its scroll range expands the gradient panel, the middle portion changes the four sector presentations and the last portion contracts the panel. Native page movement then carries the scene away. Manual tab selection remains available. A visible continuation link skips to the workflow section. No dialogs or expansion buttons are involved.

Cache geometry on content/viewport resize and update only the stage width, height and radius per animation frame. Keep the card width stable while the surround expands. Respect reduced motion by removing pinning and automatic changes; also use a normal static layout when the complete card cannot fit vertically. Clean up the observer, frame and listeners on unmount. Do not add operational-screen scroll effects.

Public copy should describe concrete work in natural sentences. Avoid slogans split into artificial fragments, uppercase eyebrow labels, decorative punctuation, counters, numbered illustration rows, redundant captions and repeated role tags. Keep only functional navigation labels and actual sector names. The public logo omits the decorative period, while the existing operational branding and business functions are preserved.

### Ambient background and expanded-card scale

`LandingBackground.tsx` adds a quiet fixed gradient and two original SVG curves derived from the brand's flowing-line direction. CSS transforms/opacity move slowly while the landing is visible; hidden tabs pause animation and reduced motion disables it. The background is decorative and absent from dedicated authentication screens. No fonts, images, video, filters or libraries are fetched for it.

The card's natural maximum width is 820px. The scroll surround grows as before while the content scales up to 1.18, limited by viewport width/height so text remains fully visible. Scroll progress uses a short damped approach in requestAnimationFrame and stops scheduling when settled. Copy/illustration/row transitions use brief staggered opacity and transform animation, disabled with reduced motion.

At the end of the sticky scene, compensate its unused vertical tail with a negative bottom margin. The sticky panel stays above the following section during its exit; the workflow's top padding is 40–56px instead of an extra viewport-sized empty area. Keep enough natural page content to complete the animation on tall windows. Checked at 1920×1080, 1440×1000, 1024×768, 375×812 and 320×568 in both themes: larger card fits, progress reaches the end, exit spacing stays compact, reduced motion disables effects, and login remains separate.
