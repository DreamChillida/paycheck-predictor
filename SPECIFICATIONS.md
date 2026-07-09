# Paycheck Predictor — Project Specifications

## Overview

A mobile-first web application for hospitality workers to log their daily shifts and predict their fortnightly pay. The app replicates the exact payslip breakdown logic used by CCIG Investments Pty Ltd (Daydream Island) for Food & Beverage Attendants under the Australian Hospitality Award.

## Target Users

- **Primary**: Food & Beverage Attendants at Daydream Island (and similar venues)
- **Secondary**: Any hospitality workers paid under similar award structures
- **Scale**: Low traffic (< 100 users), internal team tool

## Core Architecture

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 16 (App Router) | React, SSR, mobile-first, free on Vercel |
| Styling | Tailwind CSS v4 + shadcn/ui (Base UI) | Utility-first, responsive by default |
| Database | Supabase (PostgreSQL) | Free tier, relational, RLS, built-in auth |
| Auth | Supabase Auth | Email/password, free, secure |
| Hosting | Vercel (Free) | Automatic deploys from GitHub, 100GB bandwidth |
| State | TanStack Query | API caching, optimistic updates |

## Core Features (MVP)

### 1. Authentication
- Email/password registration and login
- Auto-create user profile on signup (DB trigger)
- Protected routes via middleware (redirect to /login if unauthenticated)
- Row-Level Security (RLS) ensures users only see their own data

### 2. Fortnight Dashboard
- List of all saved fortnights, sorted newest first
- Each card shows: date range, total hours, gross pay, net pay
- "New Fortnight" button creates the current fortnight and navigates to shift entry
- Empty state with CTA to create first fortnight

### 3. Shift Entry (Data Entry)
- Mobile-optimized form with time picker inputs
- Date selector with calendar popover
- **Shift 1** — start time, finish time, optional break (start/end)
- **Split Shift (Shift 2)** — toggle to add second shift with its own times and break
- **Public Holiday** toggle — automatically classifies the day as PH
- Day type badge auto-updates (Weekday / Saturday / Sunday / Public Holiday)
- Notes field (optional)
- Upsert logic — same date overwrites existing shift

### 4. Fortnight Detail (Payslip Breakdown)
Three-tab view:

| Tab | Content |
|-----|---------|
| **Breakdown** | Full payslip: hours categories with rates + dollar amounts + tax/accommodation/super |
| **Daily Log** | Per-day shift cards with times, breaks, penalties |
| **Summary** | Category totals, effective hourly rate |

### 5. Pay Settings
- Configurable hourly rates for all categories (base, Saturday, Sunday, PH, OT, allowances)
- Configurable thresholds (OT threshold, Saturday OT split, no-break threshold, super %)
- Saves new rates as a new row (version history)

## Pay Calculation Engine

### Day Classification
- **Weekday** (Mon–Fri, not PH) → Ordinary hours + possible OT
- **Saturday** → Saturday rate + possible Weekend OT
- **Sunday** → Sunday rate (all hours)
- **Public Holiday** → PH rate + possible PH OT

### Hour Categorization (per day)

```
Weekday:
  ≤ OT threshold (7.6h)          → Ordinary Hours @ base_rate
  > OT threshold, first 2h       → Weekday OT (First 2hrs) @ 1.5×
  > OT threshold + 2h            → Weekday OT (Thereafter) @ 2×

Saturday:
  ≤ Sat OT threshold (3.75h)     → Saturday @ saturday_rate (+25%)
  > Sat OT threshold             → Weekend Overtime @ 2× base

Sunday:
  All hours                      → Sunday @ sunday_rate (+50%)

Public Holiday:
  ≤ OT threshold (7.6h)          → Public Holiday @ PH_rate (+125%)
  > OT threshold                 → PH Overtime @ PH_rate (+125%)
```

### Allowances & Penalties

| Allowance | Trigger | Rate |
|-----------|---------|------|
| **Weekday 7pm-12am Allowance** | Hours worked between 7pm-midnight on weekdays | $2.81/h (pro-rated with breaks) |
| **No Break Taken** | Shift ≥5h without a break, excess hours beyond 5h | $6.47/h |
| **Broken Shift (≤3h gap)** | Two shifts same day, gap ≤3h | $3.53 flat |
| **Broken Shift (>3h gap)** | Two shifts same day, gap >3h | $5.34 flat |

### Deductions
- **PAYG Tax**: Australian 2025–26 resident tax brackets (fortnightly calculation)
- **Accommodation**: Default $314.02/fortnight (configurable per fortnight)

### Superannuation
- **SG**: 11.5% of gross earnings (configurable)

## Database Schema

### Tables
- `profiles` — extends `auth.users`, stores full_name
- `fortnights` — pay periods (14 days Mon–Sun), accommodation amount, closed flag
- `shifts` — daily shift data with dual-shift support, breaks, PH flag
- `pay_rates` — versioned rate configurations

### Security
- Row-Level Security (RLS) enabled on all tables
- Policies restrict CRUD to user's own data
- `pay_rates` is readable/insertable by all authenticated users

## UI/UX Design

### Principles
- **Mobile-first**: All layouts built for phones first (320px+), scale up to desktop
- **Thumb-friendly**: Primary actions (Save, Add Shift) at bottom of forms
- **Clear hierarchy**: Card-based layout with visual separation
- **Instant feedback**: Toast notifications for saves and errors

### Color System
- CSS variables (oklch) for light/dark mode support
- Semantic colors: background, foreground, primary, muted, destructive
- Accent badges: blue (weekday), purple (Saturday), orange (Sunday), red (PH)

### Typography
- Inter font family (variable weight)
- Responsive text scale: `text-sm` on mobile, `text-base` on desktop

### Layout
- Single-column on mobile (max-w-lg for forms, max-w-3xl for data views)
- Header bar sticks to top with logout button
- Content area with `px-4` padding on mobile
- Cards with rounded corners and subtle shadow

## Responsive Strategy

- **Breakpoints**: 640px (sm), 768px (md), 1024px (lg)
- **Grid**: Auto-fit columns that stack to single column on mobile
- **Forms**: Labels stack above inputs on narrow screens
- **Tables/breakdowns**: Wrap long text, use scroll on overflow
- **Touch targets**: Minimum 44×44px for interactive elements

## Setup & Deployment

1. Create Supabase project, run `001_schema.sql` in SQL Editor
2. Enable Email auth provider in Supabase dashboard
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars
4. Push GitHub repo to Vercel (auto-deploy)

## Bug Fixes & UX Improvements (v0.2)

### Fixed: Label Overlap in Shift Entry Form
- All time input grids changed from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` to prevent label overlap on narrow screens
- Labels use `text-xs` on mobile, `text-sm` on desktop
- Time inputs have `w-full` to fill available space
- Applies to: Shift 1/2 start/finish times, break start/finish times

### Fixed: Fortnight Deletion
- **Dashboard**: Each fortnight card has a trash button (stops card click propagation) with confirmation dialog
- **Detail page**: Trash button in header area with confirmation dialog
- Shifts cascade-delete via DB foreign key constraint
- Toast notifications on success/failure
- Dashboard list updates optimistically after delete
- Navigates back to dashboard after deleting from detail page

### Added: Dark Mode
- `next-themes` ThemeProvider wraps the app with `attribute="class"` strategy
- Dark CSS variables already present in `globals.css` (`.dark` class)
- Header has a sun/moon toggle button with animated rotation transition
- Respects system preference (`defaultTheme="system"`)
- Toggle cycles between dark/light

### Added: Analytics Page (`/analytics`)
- **Overview tab**: 4 summary stat cards (avg gross, avg net, avg hours, total fortnights) + line chart of gross/net over time
- **Trends tab**: Bar chart of hours per fortnight
- **Distribution tab**: Pie chart of latest fortnight hour breakdown + pie chart of day type distribution across all history
- Uses Recharts (`ResponsiveContainer`, `BarChart`, `LineChart`, `PieChart`)
- Empty state when no data exists

### Added: Export Page (`/export`)
- CSV export: Downloads all fortnights as a CSV with headers (dates, hours by category, earnings, tax, net, super)
- PDF export: Placeholder (prints "coming soon" toast), ready for `pdf-lib` integration
- Accessible from dashboard via download icon button
- Shows count of available fortnights

### Navigation Updates
- Dashboard header now has analytics (chart icon) and export (download icon) buttons next to "New Fortnight"
- Both pages have back navigation to dashboard

## Future Enhancements (Post-MVP)

- [ ] Multiple pay rate profiles (different roles/venues)
- [ ] PDF payslip import/scan
- [ ] Shift templates (recurring schedules)
- [ ] Team view (manager dashboard)
- [ ] Push notifications for shift reminders
- [ ] Offline support (PWA)
- [ ] Pay comparison (actual vs predicted)
