# Fabriqueta UI Redesign Spec

## 1. UX audit of the current UI

### Audit scope
This audit is based on the current frontend implementation in:

- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/project.tsx`
- `apps/web/src/components/TaskDetailsDialog.tsx`
- `apps/web/src/components/ConfirmationDialog.tsx`
- `apps/web/src/components/EpicCard.tsx`
- `apps/web/src/styles.css`

### What exists today

- A project home screen with a hero, create-project form, and project list.
- A single project page with three in-page tabs: `Board`, `Backlog`, and `Documentation`.
- A sprint board with only three status columns.
- A backlog view with search, single epic filter, sort, and basic create controls.
- A task details modal with title, description, status, and sprint placement actions.
- Documentation management inside the same product page.

### Visual hierarchy problems

- The top-level page header uses large marketing-style copy rather than operational product context. The home hero and project hero emphasize SQLite storage details instead of user goals or next actions.
- Most panels use the same visual weight: same glass background, same border treatment, same corner radius, and similar padding. There is no clear difference between primary workspace areas, secondary utilities, and tertiary metadata.
- The interface relies on many rounded containers, but few of them indicate real hierarchy. This creates a “card soup” feeling even though the app is not yet data-dense.
- The backlog sidebar and main content compete visually because both use the same panel treatment and similar heading structures.
- Board cards do not establish a clear order of importance. Title, epic, status actions, and metadata sit in one visual block without a strong first-read path.

### Navigation and IA problems

- Core navigation is buried inside local tab buttons on the project page instead of using a stable app shell.
- There is no persistent left navigation, workspace switcher, top search, quick create, or “My work” entry point.
- Documentation is treated as a peer tab to sprint delivery work, even though it is a different workflow and should likely live as a secondary product area.
- Sprint planning is mixed into the backlog sidebar rather than given its own focused planning flow.
- There is no distinction between workspace-level navigation and page-level views.
- The current product has no dashboard, reports, settings, team management, or inbox/notifications surfaces, even though those are part of the target product scope.

### Clutter and density issues

- Backlog rows expose too many action buttons inline: move to sprint, open, up, down, delete. This creates horizontal noise and makes scanning difficult.
- Reordering is handled with explicit `Up` and `Down` buttons across epics and tasks, which adds repetitive controls and visual clutter.
- The backlog sidebar stacks create epic, create task, epic ordering, sprint planning, and sprint history into one long utility column. Important actions are available, but the workflow feels fragmented.
- The board uses status-change buttons inside each card instead of direct manipulation. This adds control density and lowers visual calm.
- The task details dialog splits form and sidebar, but the sidebar is mostly lifecycle text and ordering controls rather than high-value task metadata.

### Consistency problems

- The product uses one global stylesheet with ad hoc class naming and repeated container patterns, but no clear token system for type, space, radius, surface, or interaction states.
- `primary`, `secondary`, and `ghost` buttons do not form a complete or consistent system. Some inline buttons use button reset styles; others use custom fills.
- Inputs, selects, and textareas share a base treatment, but field grouping, descriptions, validation, and focus behavior are not standardized.
- Status colors exist, but priority colors, due-date states, blocker states, and assignee treatments are missing.
- Typography is mostly one weight and one scale. Headings, body text, metadata, labels, and helper text are too close in tone.
- Iconography is text-based in places, such as `Dir` and `MD` labels in the documentation tree, rather than a coherent icon system.

### Missing UX states

- Loading states are plain text, not skeletons or progressive placeholders.
- Empty states exist, but they are generic and do not consistently provide a next-best action.
- Error states are a single inline banner without contextual recovery actions.
- Success feedback is mostly absent; actions save or mutate silently.
- Selected, focused, hovered, pressed, and keyboard-focused states are underdefined.
- There are no drag states because ordering is button-based rather than drag-and-drop.
- Disabled states only reduce opacity and set `cursor: wait`, which is not enough to communicate why an action is unavailable.

### Accessibility issues

- Focus-visible styles are not explicitly defined.
- Button-like tabs use `role="tab"` and `aria-selected`, but there is no full keyboard tablist behavior management.
- Modal dialogs are missing stronger accessibility patterns such as focus trap, labelled descriptions, and escape handling.
- Color contrast is at risk in muted beige-on-cream combinations, especially for metadata and secondary controls.
- Many click targets are dense pill buttons with little grouping logic, which will be tiring for keyboard and assistive tech users.
- The information hierarchy depends heavily on visual grouping rather than semantic landmarks.
- Status meaning relies primarily on color, with limited icon or text reinforcement.

### Workflow friction

- Creating a task requires choosing an epic in a sidebar form and does not support fast inline creation in context.
- Sprint planning is distributed across the backlog list and a sidebar panel instead of a dedicated planning workspace.
- Users cannot understand sprint health in one glance because the board lacks summary metrics such as blocked items, overdue tasks, scope change, and completion trend.
- Users cannot quickly find work assigned to them because assignees do not exist in the current UI model.
- Board task status changes require clicking explicit action buttons, which is slower than drag-and-drop or inline menus.
- Important signals like blockers, overdue work, high priority, and dependencies are not visible at row or card level.
- There is no bulk action model, saved filter model, command menu, or keyboard shortcut layer.

### Concrete implementation references

- The project home prioritizes storage-copy messaging over product navigation and decision support in `apps/web/src/routes/index.tsx`.
- The entire project experience is consolidated into a single route with local tabs and large stateful logic in `apps/web/src/routes/project.tsx`.
- Board cards show only title, epic, and status change buttons, with no assignee, priority, due date, comments, or blockers in `apps/web/src/routes/project.tsx`.
- Task detail editing is modal-only and limited to title, description, and status in `apps/web/src/components/TaskDetailsDialog.tsx`.
- The visual system is a handcrafted warm glass treatment with minimal tokenization in `apps/web/src/styles.css`.

## 2. Redesigned information architecture

### Product-level navigation

Use a persistent app shell:

- Left sidebar:
  - Home
  - My work
  - Projects
  - Backlog
  - Active sprint
  - Reports
  - Team
  - Settings
- Top bar:
  - Workspace switcher
  - Global search / command palette trigger
  - Saved filter quick access
  - Notifications
  - Quick create
  - User menu

### Workspace structure

Inside a project, use second-level navigation:

- Overview
- Backlog
- Sprint planning
- Board
- Calendar/List
- Reports
- Docs
- Settings

### Core object model in UI

- Workspace
- Project
- Sprint
- Epic
- Task / issue
- Views
- Saved filters
- Team members
- Reports

### Content hierarchy rules

- Global shell answers: where am I in the product?
- Page header answers: what area am I in and what can I do next?
- Subheader / toolbar answers: how am I viewing this data right now?
- Row / card answers: what matters about this item without opening it?
- Drawer / modal answers: how do I edit this quickly without losing context?

## 3. Complete visual design direction

### Brand direction

Aim for a calm, precise, premium product feel.

- Personality: focused, trustworthy, capable, modern.
- Mood: clean and composed, with subtle depth rather than heavy ornament.
- Style: refined light theme with slate, stone, blue, and muted accent tones.
- Identity: more editorial and operational than “glass dashboard.”

### Layout direction

- Use a neutral application canvas, not a decorative full-page gradient.
- Reserve tinted surfaces for selected states, highlights, and insights.
- Reduce rounded excess. Use tighter radii for dense surfaces and larger radii only for overlays and hero groupings.
- Favor alignment, spacing rhythm, and typography to create premium feel.

### Recommended light palette

- App background: `#F6F7F9`
- Subtle canvas tint: `#F1F3F6`
- Surface: `#FFFFFF`
- Surface raised: `#FCFCFD`
- Surface muted: `#F8FAFC`
- Border subtle: `#E5E9F0`
- Border strong: `#D5DBE5`
- Text primary: `#111827`
- Text secondary: `#475467`
- Text tertiary: `#667085`
- Brand primary: `#2563EB`
- Brand hover: `#1D4ED8`
- Brand tint: `#DBEAFE`
- Accent teal: `#0F766E`
- Accent amber: `#D97706`
- Accent rose: `#DC2626`

### Dark theme support

- Use the same token names with dark equivalents.
- Avoid pure black. Use deep slate bases.
- Keep status colors slightly desaturated to prevent neon overload.

## 4. Design system specification

### Typography scale

- Font family:
  - UI sans: `Inter`, `Manrope`, or `Suisse Intl` equivalent.
  - Mono: `JetBrains Mono` or `SF Mono` for IDs, estimates, and command hints.
- Size scale:
  - `12 / 16` meta
  - `13 / 18` label
  - `14 / 20` body-sm
  - `16 / 24` body
  - `18 / 28` title-sm
  - `20 / 30` title
  - `24 / 34` page section
  - `32 / 40` page title
- Weight scale:
  - 400 regular
  - 500 medium
  - 600 semibold
  - 700 bold

### Color roles

- Base:
  - `bg/default`
  - `bg/subtle`
  - `bg/elevated`
  - `border/subtle`
  - `border/strong`
  - `text/primary`
  - `text/secondary`
  - `text/tertiary`
- Brand:
  - `brand/solid`
  - `brand/hover`
  - `brand/subtle`
- Semantic:
  - `success`
  - `warning`
  - `danger`
  - `info`

### Status colors

- Todo: slate chip with pale neutral fill
- In progress: blue chip with pale blue fill
- Blocked: red chip with pale rose fill and alert icon
- Review: violet or indigo chip with pale fill
- Done: green chip with pale green fill

### Priority colors

- Low: gray
- Medium: blue
- High: amber
- Urgent: red

### Spacing system

Use a 4px base grid:

- `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Usage:

- Dense row cell padding: `8-12`
- Standard control height: `36-40`
- Page section gap: `24`
- Major layout gap: `32`

### Border radius

- `6` for chips and compact controls
- `8` for inputs and table rows
- `10` for cards
- `12` for drawers and modals
- `16` only for rare highlight panels

### Elevation

- `shadow-xs`: control hover
- `shadow-sm`: dropdown, sticky toolbars
- `shadow-md`: drawers
- `shadow-lg`: modal

Keep shadows cool and subtle:

- `0 1px 2px rgba(16,24,40,0.06)`
- `0 8px 24px rgba(16,24,40,0.10)`

### Icon style

- Use a modern 1.5px or 1.75px stroke set such as Lucide.
- Icons should clarify state and action, not decorate.
- Pair icons with text in dense action bars only when clarity improves.

### Buttons

- Primary:
  - Solid brand fill
  - Height `40`
  - Padding `0 14`
  - Semibold label
- Secondary:
  - Neutral surface fill with border
- Tertiary:
  - Text button for low-emphasis actions
- Destructive:
  - Red border or fill depending on urgency
- Icon button:
  - `32` or `36` square with tooltip

### Inputs and selects

- Height `40`
- Border `1px solid border/subtle`
- Background `surface`
- Focus ring `2px brand/subtle`
- Placeholder `text/tertiary`
- Include helper text and error text slots

### Tabs

- Underline or pill hybrid, depending on location.
- Page-level views should use underline tabs with strong active indicator, not oversized bubbles.
- Workspace shell navigation should not visually compete with page-level tabs.

### Filters

- Use a sticky filter bar above dense content.
- Filters should support:
  - search
  - assignee
  - status
  - priority
  - sprint
  - due date
  - labels
  - blocker only
  - mine only
- Saved filter pills should appear next to the search field.

### Search

- Global search in top bar.
- Local search inside backlog/board/report pages.
- Keyboard shortcut hint `⌘K` or `Ctrl+K`.

### Tables

- Prefer table/list layout for backlog and reports.
- Header row sticky inside scroll container.
- Row height:
  - compact `44`
  - comfortable `52`
- Hover row background subtle neutral tint.
- Selected rows show left accent bar and checkbox state.

### Cards

- Use cards only for summary modules, health insights, workload blocks, and overlays.
- Avoid wrapping every list inside another card.

### Kanban cards

- Card anatomy:
  - top row: type icon, priority flag, blocked marker
  - title
  - one-line metadata: assignee, estimate, due date
  - bottom row: comments, attachments, labels
- States:
  - blocked: left red rule or blocker badge
  - overdue: due date chip turns red
  - mine: subtle brand-tinted outline
  - selected: stronger outline and shadow
  - dragging: elevated card with rotation `1deg` max

### Modals and drawers

- Use right drawer for quick task editing.
- Use full modal only for destructive flows or complex setup like sprint creation.
- Drawer width:
  - desktop `480-560`
  - tablet `420`
  - mobile full-screen sheet

### Tooltips

- Short, plain language.
- Show keyboard shortcuts and field guidance.

### Toasts

- Top-right on desktop, bottom on mobile.
- Variants: success, error, info.
- Every destructive or save action should provide confirmation.

### Empty states

- Must explain:
  - what this space is
  - why it is empty
  - what to do next
- Include one primary CTA and one secondary help link where useful.

### Loading skeletons

- Use section-level skeletons for dashboards and tables.
- Preserve final layout while loading to reduce jumps.

### Error states

- Provide recovery actions:
  - retry
  - go back
  - contact admin or inspect integration
- Use inline field errors for forms, banner errors for page failures.

### Badges and chips

- Small radius `999` or `6` depending on density.
- Use chips for status, priority, assignee, label, dependency, overdue.

### Avatars

- `24` in rows
- `28` in boards
- `32-40` in headers and team screens

### Navigation/sidebar

- Width `240-264`
- Group navigation into:
  - Workspace
  - Delivery
  - Insights
  - Admin
- Show project favorites and recents.

### Breadcrumbs

- Use for deeper pages:
  - `Workspace / Project / Backlog`
  - `Workspace / Project / Reports`

### Command menu

- Trigger: `⌘K` / `Ctrl+K`
- Actions:
  - create task
  - go to backlog
  - open project
  - assign task
  - start sprint
  - complete sprint
  - save current filter

### Keyboard shortcuts

- `C`: create task
- `G then B`: go to backlog
- `G then S`: go to sprint board
- `G then R`: go to reports
- `F`: focus filters
- `/`: focus local search
- `E`: edit selected task
- `V`: change view
- `[` and `]`: move between tasks or columns when applicable

## 5. Detailed redesign instructions by screen

### Main dashboard

Purpose:

- Tell a user what needs attention now.

Layout:

- Page header:
  - title `Home`
  - short description
  - quick actions: `Create task`, `Start sprint`, `View my work`
- Top summary row, 4 tiles max:
  - sprint health
  - tasks assigned to me
  - overdue items
  - blockers
- Main body two-column desktop layout:
  - left `2fr`:
    - active sprint health card
    - my work list
    - upcoming deadlines
  - right `1fr`:
    - team workload
    - recent activity
    - quick create

Sprint health card:

- Show:
  - sprint name
  - days remaining
  - committed vs completed
  - blocked count
  - scope change count
  - burndown sparkline
- Include one primary CTA: `Open sprint board`

My work list:

- Default sort:
  - overdue
  - blocked
  - in progress
  - due soon
- Each row:
  - title
  - project
  - status
  - priority
  - due date

### Project / workspace overview

Layout:

- Header:
  - breadcrumb
  - project title
  - project description
  - primary action `Create task`
  - secondary `Start sprint` or `Complete sprint`
- Overview strip:
  - active sprint
  - open tasks
  - overdue
  - blockers
  - average cycle time
- Main content:
  - left:
    - active sprint card
    - recent work
    - backlog health
  - right:
    - team workload
    - recent comments/activity
    - risks

### Backlog

Structure:

- Sticky page toolbar:
  - search
  - saved filters
  - filter chips
  - group by
  - sort
  - bulk actions
  - `Create task`
- Optional secondary toolbar:
  - view switch: `List`, `Board`, `Calendar`

List design:

- Use dense table/list, not stacked large cards.
- Columns:
  - selection checkbox
  - task title
  - status
  - priority
  - assignee
  - estimate
  - due date
  - epic
  - sprint
  - updated
- Hide less critical columns on tablet.
- Use row hover actions at far right:
  - assign
  - change status
  - open drawer
  - more menu

Drag-and-drop ordering:

- Use drag handle on left.
- Show insertion line and ghost row.
- Preserve sort/order modes clearly. Only allow manual ordering when `Sort: Backlog order` is active.

### Sprint planning

Layout:

- Split view:
  - left backlog candidate list
  - right sprint scope panel
- Header:
  - sprint selector or new sprint setup
  - sprint goal field
  - duration and date range
  - capacity meter
  - `Start sprint`

Right panel:

- sprint capacity by team member
- total points/hours
- committed count
- risk warnings
- overcommitment warnings

Backlog candidate rows:

- show estimate, assignee, priority, dependencies, blockers
- CTA `Add to sprint`
- support drag from backlog list into sprint scope

### Sprint board / Kanban board

Layout:

- Header:
  - sprint name
  - progress bar
  - committed/completed
  - blocked
  - overdue
  - filter button
  - `Complete sprint`
- Horizontal columns with sticky headers.

Column header content:

- status name
- task count
- WIP limit if used

Card content:

- first line:
  - issue type icon
  - priority marker
  - blocked badge if needed
- title max 2 lines
- metadata row:
  - assignee avatar
  - estimate
  - due date
- footer:
  - comments count
  - attachments count
  - labels

Visual distinctions:

- blocked: thin red top border and blocker icon
- overdue: due chip in red
- mine: subtle brand outline
- high priority: amber flag icon, not full card color flood

Drag states:

- lifted card shadow
- drop-zone highlight in column
- placeholder slot

### Task detail page / drawer

Use a right-side drawer for fast edit.

Header:

- task key + title
- status dropdown
- assignee avatar select
- priority select
- due date
- estimate
- more actions

Body layout:

- main column:
  - description
  - subtasks
  - comments
  - activity
- right rail:
  - project
  - sprint
  - epic
  - labels
  - relationships
  - attachments
  - created/updated

Editing:

- inline by default
- autosave or explicit `Save` depending on data model maturity
- markdown support for description and comments

### Reports / sprint analytics

Do not create chart overload.

Page layout:

- top row:
  - sprint selector
  - date range
  - team filter
- summary cards:
  - committed vs completed
  - velocity
  - cycle time
  - scope change
- main charts:
  - burndown
  - velocity trend
  - workload distribution
- bottom insights:
  - blocker hotspots
  - carryover reasons
  - late work

Every chart should answer a question:

- Are we burning down on track?
- Did we overcommit?
- Where is work getting stuck?
- Who is overloaded?

### Settings and team management

Use category pages:

- General
- Members and roles
- Status workflow
- Priorities
- Notifications
- Integrations
- Views and saved filters

Form design:

- max content width `720`
- sticky save bar when dirty
- inline descriptions under labels
- dangerous actions isolated at bottom

## 6. Component-level implementation guidance

### App shell

- Build a reusable `AppShell` layout with:
  - `Sidebar`
  - `Topbar`
  - `PageHeader`
  - `PageToolbar`
  - `ContentArea`
- Stop rendering pages as standalone full-width stacks.

### Design tokens

- Replace hardcoded values in `styles.css` with semantic CSS variables or a token layer.
- Separate:
  - color tokens
  - typography tokens
  - spacing tokens
  - radius tokens
  - shadow tokens
  - z-index tokens

### Component primitives to build first

- Button
- IconButton
- Input
- Textarea
- Select
- Badge
- Avatar
- Tooltip
- Dropdown menu
- Tabs
- Table
- Drawer
- Modal
- Toast
- EmptyState
- Skeleton
- Banner

### Backlog row primitive

- Build a reusable `IssueRow`.
- Props:
  - selected
  - compact
  - showProject
  - showSprint
  - showAssignee
  - showDueDate
  - dragState

### Kanban card primitive

- Build a reusable `IssueCard`.
- Keep metadata slots optional.
- Add variant props for `blocked`, `mine`, `overdue`, and `dragging`.

### Filters and saved views

- Build a normalized filter state model now, even if saved filters ship later.
- Represent filters as chips in UI and in URL query params.

### Command palette

- Implement as app-level overlay.
- Reuse route metadata and action registry.

## 7. Accessibility checklist

- All interactive elements reachable by keyboard.
- Visible focus ring on every button, link, input, menu item, tab, row action, and card action.
- Color contrast at least WCAG AA.
- Don’t rely on color alone for status or urgency.
- Provide semantic landmarks:
  - `header`
  - `nav`
  - `main`
  - `aside`
  - `section`
- Ensure modals and drawers:
  - trap focus
  - close on escape
  - return focus to opener
  - have labelled titles
- Table/list rows need proper semantics.
- Drag-and-drop needs keyboard alternative.
- Touch targets minimum `40x40` where practical.
- Support reduced motion preferences.
- Announce toasts and mutation results through polite live regions.

## 8. Responsive behavior rules

### Desktop

- Sidebar fixed.
- Top bar fixed or sticky.
- Multi-column analytics and planning layouts allowed.
- Backlog table uses full column set.

### Tablet

- Sidebar can collapse to icon rail.
- Secondary panels move below main content.
- Reduce visible backlog columns to:
  - title
  - status
  - assignee
  - due date
  - priority

### Mobile

- Sidebar becomes bottom nav or slide-over menu.
- Page header actions collapse into one primary CTA plus overflow menu.
- Backlog becomes card list with inline chips.
- Filters open in bottom sheet.
- Task detail becomes full-screen sheet.
- Charts stack vertically.

### Global responsive rules

- Never rely on hover-only actions.
- Preserve critical status signals in all sizes.
- Avoid horizontal scroll except in kanban board, where it is expected and managed.

## 9. Empty, loading, error, and success states

### Empty states

- Dashboard:
  - “No active sprint yet”
  - CTA: `Create sprint`
  - Secondary: `Import backlog`
- Backlog:
  - if no tasks: explain backlog purpose and prompt `Create first task`
  - if filters empty the list: `Clear filters`
- Board:
  - if no sprint: `Start sprint`
  - if no tasks in column: contextual copy
- Reports:
  - if insufficient history: explain what is needed to generate analytics

### Loading

- Use skeleton cards for dashboard summary tiles.
- Use skeleton rows for backlog and sprint scope tables.
- Use board card skeletons inside existing columns.
- Use drawer skeleton for task detail load.

### Error

- Page error:
  - title
  - brief explanation
  - `Retry`
  - `Go back`
- Inline form error:
  - under the field
- Integration error:
  - show source and resolution hint

### Success

- Toasts:
  - `Task created`
  - `Sprint started`
  - `Filter saved`
  - `Status updated`
- Optional undo for low-risk actions like archive, remove from sprint, or bulk status change.

## 10. Prioritized implementation roadmap

### Phase 1: highest-impact visual cleanup

- Introduce design tokens and replace the current warm glass visual language with a cleaner SaaS surface system.
- Build an app shell with left sidebar and top bar.
- Replace oversized hero copy with operational page headers.
- Standardize typography, spacing, button styles, input styles, and badge styles.
- Refactor backlog rows and board cards for scanability.
- Add focus states, hover states, disabled states, and toasts.

Definition of done:

- Product looks intentional and consistent.
- Primary navigation is stable.
- Core screens no longer feel cluttered or amateur.

### Phase 2: workflow and navigation improvements

- Create separate screens for Overview, Backlog, Sprint planning, Board, Reports, Team, and Settings.
- Add sticky filter/search toolbar.
- Replace `Up` and `Down` ordering controls with drag-and-drop plus keyboard alternative.
- Introduce right-side task drawer.
- Add assignee, priority, due date, estimate, and blocker fields to the UI model.
- Add `My work` view and quick create task flow.

Definition of done:

- Users can create a task in under 30 seconds.
- Users can find assigned work immediately.
- Sprint planning and execution are clearly separated.

### Phase 3: advanced productivity features

- Saved filters and sharable views
- Global command palette
- Bulk actions
- Inline editing
- Notifications preferences
- Calendar/list toggle
- Better onboarding and guided empty states

Definition of done:

- Power users can work mostly from keyboard.
- Teams can save and reuse common workflows.

### Phase 4: polish, accessibility, and analytics

- Full accessibility pass
- Reduced-motion and dark-theme support
- Reports and analytics polish
- Team workload visualization
- Scope change, velocity, and cycle time reporting
- Final microinteractions and motion tuning

Definition of done:

- Product feels production-ready, inclusive, and analytically useful.

## Suggested implementation order in this codebase

1. Introduce route-level layout primitives and break `project.tsx` into page modules.
2. Create tokenized styles or migrate to a component styling approach.
3. Ship the app shell and page header system.
4. Redesign backlog list and task drawer first.
5. Redesign sprint board second.
6. Add overview/dashboard and planning surfaces.
7. Add reports, team, and settings after the core task workflows feel solid.
