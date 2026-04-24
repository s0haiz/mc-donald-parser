# LogIQ Dashboard — Design Guidelines

## Visual language

- **Font:** system-ui / sans-serif stack via Tailwind defaults
- **Color tokens:** shadcn/ui CSS variables (`--background`, `--foreground`, `--primary`, `--muted`, etc.) — never hardcode hex values
- **Border radius:** `rounded-lg` (8 px) for cards, `rounded-md` (6 px) for inputs and buttons
- **Spacing:** 4 px grid — use Tailwind spacing scale (`p-4`, `gap-6`, etc.)

## Layout

- **Sidebar:** fixed width, always visible; shows folder tree and connection indicator
- **Main content:** fluid, padded with `p-6`
- **Cards:** `bg-card border rounded-lg shadow-sm` — use for tool cards and log viewer panels
- **Page header:** breadcrumb + page title (`text-2xl font-semibold`) + optional action buttons aligned right

## Components

- Use shadcn/ui primitives; do not write raw HTML inputs or buttons
- Confidence pills: green (`bg-green-100 text-green-800`) ≥ 95%, amber 70–94%, red < 70%
- Line-type chips for events: use fixed color per type (ALARM → red, WARNING → amber, SENSOR_READ → blue, PROCESS_STEP → purple, INFO → muted)
- Upload zone: dashed border, centered icon + label, highlight on drag-over

## Interaction

- Navigation is client-side via React Router — no full page reloads
- Backend status shown as a colored dot in the sidebar (green = online, red = offline)
- File parsing is triggered immediately on drop — no manual confirmation step required
- After parsing, auto-navigate to the target tool page and open the Normalized tab

## Accessibility

- All interactive elements must be keyboard-navigable
- Use semantic HTML (`<main>`, `<nav>`, `<section>`) inside page components
- Provide `aria-label` on icon-only buttons
