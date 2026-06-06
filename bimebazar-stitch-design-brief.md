# BimeBazar Performance Management Platform

## Purpose

Design a production-ready, easy-to-use web app UI for BimeBazar's internal Performance Management Platform.

The current project already includes implementation scaffolds for authentication, employee profiles, RBAC, form building, performance processes, evaluations, feedback, notifications, reports, PIP, promotions, OKRs, analytics, and admin workflows. The goal of this Stitch design pass is to turn these feature pages into one cohesive product experience for real end users.

## Product Positioning

BimeBazar Performance Management is an internal HR operations product for managing employee performance cycles, evaluations, feedback, development conversations, promotions, PIPs, reporting, and compliance.

This should feel like a serious enterprise SaaS product for an Iranian insurance/fintech company:

- Clear
- Calm
- Trustworthy
- Operational
- Fast to scan
- Easy for non-technical users
- Optimized for repeated daily work

Avoid a marketing website style. The first screen should be the actual application dashboard, not a landing page.

## Target Users

### Employee

Needs to complete self-assessments, receive feedback, view assigned forms, read notifications, check personal goals, and see relevant performance-cycle status.

### Manager

Needs to review team tasks, approve evaluations, complete downward evaluations, review self-assessments, manage PD Chats, request feedback, and see team health.

### HRBP

Needs to monitor performance cycles, review escalations, manage PIP and promotion workflows, inspect reports, and support managers.

### HR Admin

Needs to configure the system, manage profiles, roles, form templates, process settings, imports, audit logs, permissions, reports, notifications, and integrations.

## Core Design Goals

- Make the system feel unified instead of many separate temporary pages.
- Hide technical implementation language from end users.
- Use task-based navigation and plain labels.
- Prioritize "what needs my attention now".
- Make status, owner, and next action visible in every workflow.
- Support Persian and English.
- Support RTL layout.
- Use Jalali dates wherever dates are shown.
- Keep role permissions understandable through visible access states, not technical messages.
- Make forms feel safe and simple with progress, autosave, clear required fields, and review summaries.
- Make reports readable through cards, simple charts, filters, and export actions.
- Make auditability visible but not overwhelming.

## Global UX Requirements

Every workflow item should show:

- Status
- Current owner
- Next action
- Due date or period
- Primary action
- Secondary actions
- Audit/history access

Use plain status labels:

- Draft
- In Progress
- Waiting for Employee
- Waiting for Manager
- Waiting for Next-Level Manager
- Waiting for Head
- Waiting for HRBP
- Waiting for HR Admin
- Returned
- Approved
- Completed
- Archived

Avoid technical labels in the UI:

- Do not show database table names.
- Do not show API route names.
- Do not show raw permission codes.
- Do not show `status`, `owner_role`, or `next_action` as field names.

Translate those concepts into human labels:

- `status` becomes "Status"
- `owner` becomes "Responsible person/team"
- `nextAction` becomes "Next step"

## Information Architecture

Use a left sidebar plus top bar layout.

### Primary Navigation

- Home
- My Tasks
- People
- Performance Cycles
- Evaluations
- Goals
- Feedback
- Development Chats
- Career Actions
- Reports
- Administration

### Secondary Navigation Under Administration

- Users & Profiles
- Roles & Access
- Form Templates
- Process Setup
- Imports & Exports
- Notifications
- Calendar & Language
- Integrations
- Audit Log

### Top Bar

- Search
- Current role/view switcher
- Notifications
- Language switcher
- User menu

## Visual Style

Use a clean operational SaaS interface.

### Color Direction

- Primary: teal or green inspired by BimeBazar
- Neutrals: white, very light gray, charcoal text
- Success: green
- Warning: amber
- Error/Risk: red
- Info: blue or teal

Avoid heavy gradients, decorative blobs, large illustrations, and marketing-style hero sections.

### Typography

- Use a modern readable UI font.
- Prioritize legibility in Persian and English.
- Use compact headings inside dashboards and panels.
- Do not use oversized hero typography in app screens.

### Layout

- Dense but readable.
- Use 8px border radius.
- Use clear spacing and alignment.
- Avoid cards inside cards.
- Use full-width sections or structured panels.
- Data tables should be easy to scan.

## Design System Components

Create a reusable component system for:

- Sidebar navigation
- Top bar
- Role switcher
- Global search
- Breadcrumbs
- Task cards
- Status pills
- Priority badges
- Progress indicators
- Form sections
- Form question components
- Autosave indicator
- Approval timeline
- Audit history drawer
- Notification item
- Empty state
- Filter bar
- Data table
- Table row actions
- Export button
- Chart card
- KPI card
- Modal dialog
- Confirmation dialog
- Toast notification
- Language switcher
- Jalali date picker
- User avatar
- Employee profile header
- Org chart node
- Workflow stepper

## Role-Based Dashboard

Design one dashboard shell that changes content by role.

### Employee Dashboard

Show:

- My open tasks
- Current performance cycle progress
- Self-assessment due date
- Feedback received
- Kudos feed preview
- Goals progress
- Notifications

Primary actions:

- Continue self-assessment
- View feedback
- Update goals
- Start PD Chat note

### Manager Dashboard

Show:

- Team tasks needing approval
- Evaluation completion status
- Direct reports list
- Returned items
- Team health score
- Feedback requests
- PD Chat schedule

Primary actions:

- Review evaluation
- Approve self-assessment
- Start team feedback request
- Schedule PD Chat

### HRBP Dashboard

Show:

- Active cycles
- Process health
- PIP and promotion cases
- Escalations
- Report snapshots
- Analytics trends
- Feedback anonymity guard alerts

Primary actions:

- Review case
- Open report
- Check analytics
- Resolve escalation

### HR Admin Dashboard

Show:

- System setup checklist
- Recent imports
- Active forms
- Role/access changes
- Audit exceptions
- Integration status
- Notification delivery status

Primary actions:

- Create process
- Build form
- Import employees
- Review audit log

## Screen Briefs

### 1. Login

Purpose: Let users sign in clearly and confidently.

Design:

- Centered login panel
- BimeBazar brand presence
- Email and password fields
- Forgot password
- Language switch
- Clear error state
- No technical Supabase wording

Current page:

- `temp-login.html`

### 2. All Pages / App Home

Purpose: Replace the temporary page index with a real product home.

Design:

- Use role dashboard as the first app screen.
- Remove the old page-index utility from the end-user flow.

Current page:

- Product workspace navigation

### 3. Employee Profiles

Purpose: Manage employee details manually and through imports.

Design:

- People directory with filters
- Employee profile detail page
- Profile sections: Personal, Organization, Manager, HRBP, Roles, Status, History
- Jalali date display
- Clear active/deactivated state

Current pages:

- `temp-profiles.html`
- `temp-profile-org-chart.html`
- `temp-bulk-import.html`
- `temp-employee-export.html`

### 4. Roles And Access

Purpose: Manage five-role RBAC and automatic manager assignment.

Design:

- Role matrix
- User role assignments
- Automatic manager assignment status
- Clear explanation of computed vs manual roles
- Audit trail for role changes

Current page:

- `temp-rbac.html`

### 5. Calendar And Language

Purpose: Configure Jalali/Gregorian and Persian/English preferences.

Design:

- Settings page with preview examples
- RTL toggle preview
- Language switcher
- Timezone selector
- Date display sample

Current pages:

- `temp-calendar.html`
- `temp-rtl.html`

### 6. Form Builder

Purpose: Build and manage performance form templates.

Design:

- Form template list
- Drag-and-drop form builder layout
- Question type library
- Preview panel
- Version history
- Conditional logic editor
- Publish/submit approval workflow

Question types:

- Short text
- Long text
- Number
- Rating scale
- Single choice
- Multiple choice
- Dropdown
- Date
- File upload
- Section header
- Weighted score question

Current pages:

- `temp-form-builder.html`
- `temp-form-versioning.html`
- `temp-conditional-logic.html`

### 7. Process Engine

Purpose: Create and manage performance cycles and process instances.

Design:

- Process list
- Process setup wizard
- Eligible employee preview
- Locked form version indicator
- Process detail with form instance table
- Admin move action with required reason

Current pages:

- `temp-process-engine.html`
- `temp-process-form-instances.html`
- `temp-individual-surveys.html`
- `temp-pulse-surveys.html`

### 8. Evaluations

Purpose: Complete and approve mid-cycle, end-cycle, self-assessment, and side-by-side evaluations.

Design:

- Evaluation inbox
- Evaluation form page with sections and progress
- Weighted score hidden until submission
- Section contribution after submission
- Approval chain timeline
- Return reason panel
- Side-by-side comparison view

Current pages:

- `temp-self-assessment.html`
- `temp-downward-routing.html`
- `temp-end-cycle-evaluation.html`
- `temp-mid-cycle-evaluation.html`
- `temp-side-by-side-evaluation.html`

### 9. MPA

Purpose: Manage employee MPA agreements and version history.

Design:

- MPA list
- Rich text editor
- Approval workflow
- Auto-attach status to evaluation
- Version history drawer
- Prevent duplicate active MPA clearly

Current pages:

- `temp-mpa.html`
- `temp-mpa-history.html`

### 10. Feedback And Kudos

Purpose: Request feedback, manage anonymity, and recognize employees through Kudos.

Design:

- Feedback request form
- Recipient search excluding deactivated users
- Anonymous feedback guard with minimum-response status
- Kudos feed with composer
- Review/publish workflow for Kudos
- Real-time feed feel

Current pages:

- `temp-feedback.html`
- `temp-kudos-feed.html`

### 11. PD Chat

Purpose: Log development conversations and schedule recurring chats.

Design:

- PD Chat timeline
- Employee-manager chat notes
- Auto-attach status to evaluations
- Recurring scheduler
- Upcoming conversations

Current pages:

- `temp-pd-chat.html`
- `temp-pd-chat-scheduler.html`

### 12. Career Actions

Purpose: Manage promotion and PIP workflows.

Design:

- Career action list
- Promotion case detail
- PIP case detail
- PIP hidden-from-employee visibility state
- HRBP activation control
- Linked evaluation source

Current pages:

- `temp-promotion.html`
- `temp-pip.html`
- `temp-performance-band-flags.html`

### 13. Goals / OKRs

Purpose: Create and review goal cascading.

Design:

- Goal tree/cascade view
- Goal detail panel
- Key result progress
- Weighting display
- Approval workflow

Current page:

- `temp-goals.html`

### 14. Notifications

Purpose: Show in-app and email notifications.

Design:

- Notification center
- Unread/read/archive states
- Group by urgency
- Preferences page
- Email queue/status page

Current pages:

- `temp-notifications.html`
- `temp-notification-preferences.html`
- `temp-email-notifications.html`

### 15. Reports And Analytics

Purpose: Provide HRBP and HR Admin with readable operational insight.

Design:

- Report dashboard
- KPI cards
- Trend charts
- Cohort comparison table
- Filters
- Export controls
- Snapshot workflow
- Advanced analytics page for trends and cohorts

Current pages:

- `temp-hrbp-reports.html`
- `temp-advanced-analytics.html`
- `temp-team-health.html`

### 16. Audit Log

Purpose: Inspect immutable compliance events.

Design:

- Searchable audit table
- Filters by actor, action, module, date
- Event detail drawer
- Hash-chain integrity indicator
- Export action

Current page:

- `temp-audit-log.html`

### 17. HRIS Integration

Purpose: Configure and monitor HRIS API sync.

Design:

- Integration setup form
- Connection status
- Preview sync results
- Error list
- Last sync summary
- Manual sync action

Current page:

- `temp-hris-integration.html`

## Important Workflow Pattern

Use the same workflow pattern across the app:

1. Summary header
2. Current status card
3. Responsible owner
4. Next action
5. Due date or period
6. Primary action button
7. Secondary actions
8. Approval timeline
9. Audit/history drawer

Example:

- Status: Waiting for HRBP
- Responsible: HRBP
- Next step: Approve or return
- Primary action: Approve
- Secondary action: Return with reason

## Accessibility Requirements

- High contrast text
- Keyboard navigable controls
- Visible focus states
- Clear form labels
- Error messages near fields
- Do not rely on color alone for status
- Use readable table spacing
- Support long Persian labels without clipping

## RTL And Bilingual Requirements

Design every screen so it works in:

- English LTR
- Persian RTL

Requirements:

- Sidebar should mirror in RTL.
- Tables should align correctly in RTL.
- Form labels and inputs should not overlap.
- Status pills should support Persian text.
- Dates should support Jalali format.
- Language switcher should be visible in top bar or user menu.

## Suggested Persian Labels

Use these as examples, not final copy:

- Home: خانه
- My Tasks: کارهای من
- People: افراد
- Evaluations: ارزیابی‌ها
- Goals: اهداف
- Feedback: بازخورد
- Reports: گزارش‌ها
- Settings: تنظیمات
- Status: وضعیت
- Next step: مرحله بعد
- Approve: تأیید
- Return: بازگرداندن
- Submit: ارسال
- Export: خروجی گرفتن

## Stitch Output Instructions

Generate a cohesive app UI design, not separate unrelated pages.

Create:

- A design system
- A role-based dashboard
- Key app screens
- Reusable components
- Responsive desktop-first layouts
- Mobile adaptations for task review and form completion
- RTL/Persian variants for at least the dashboard, evaluation form, and profile page

Prioritize these screens first:

1. Role-based dashboard
2. My Tasks inbox
3. Evaluation form
4. Manager approval workflow
5. Employee profile
6. Reports and advanced analytics
7. Feedback and Kudos
8. Admin settings

## Tone Of UI Copy

Use direct, human wording:

- "Review evaluation"
- "Send to manager"
- "Return with reason"
- "Waiting for HRBP"
- "Score visible after submission"
- "No employees match this filter"
- "This PIP is hidden from the employee"

Avoid:

- Technical route names
- Database terms
- Raw permission codes
- Developer-only labels

## Final Design Goal

The final UI should make BimeBazar Performance Management feel like one complete product that a non-technical employee, manager, HRBP, or HR Admin can use confidently without training.
