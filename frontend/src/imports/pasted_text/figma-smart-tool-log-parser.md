# LogIQ — Smart Tool Log Parser (Figma Design Spec)

> This file was pasted from the Figma design hand-off for the LogIQ dashboard.

---

## Screens

### 1. Dashboard (root `/`)

- Left sidebar: folder tree listing Dry Etch, EUV Scanners, CMP Tools
- Top bar: "LogIQ" wordmark + backend connection indicator (colored dot + label)
- Main area: tool cards in a responsive grid (2–3 columns)
- Floating upload zone at the bottom of the main area: dashed border, upload icon, "Drop a log file to parse" label

### 2. Folder Page (`/folder/:folderId`)

- Breadcrumb: Dashboard › Folder Name
- Grid of ToolCards for tools in that folder
- Each ToolCard shows: tool name, folder badge, last-parsed timestamp, log count

### 3. Tool Page (`/tool/:toolId`)

- Breadcrumb: Dashboard › Folder › Tool Name
- Four tabs: **Normalized**, **Events**, **Review**, **Raw**
- **Normalized tab:** table with columns — Field, Value, Unit, Source Field, Method, Confidence
- **Events tab:** list of log events with timestamp, line type chip, message
- **Review tab:** table of unmapped raw fields awaiting operator confirmation
- **Raw tab:** `<JSONViewer>` tree rendering the full canonical envelope

### 4. Tool Settings (`/tool/:toolId/settings`)

- Form: tool name, folder assignment
- Danger zone: clear parsed logs

---

## Component inventory

| Component | Location | Notes |
|---|---|---|
| UploadDialog | `components/UploadDialog.tsx` | Drop zone + parse-on-drop |
| ToolCard | `components/ToolCard.tsx` | Card with checkbox select |
| EnrichedLogViewer | `components/EnrichedLogViewer.tsx` | Tabbed normalized output |
| JSONViewer | `components/JSONViewer.tsx` | Collapsible JSON tree |
| LogRow | `components/LogRow.tsx` | Single event row |
| ConnectionIndicator | `components/ConnectionIndicator.tsx` | Backend online/offline dot |
| Breadcrumb | `components/Breadcrumb.tsx` | Page trail |

---

## Design tokens (key values)

| Token | Value |
|---|---|
| Primary | `hsl(var(--primary))` |
| Muted foreground | `hsl(var(--muted-foreground))` |
| Card background | `hsl(var(--card))` |
| Border | `hsl(var(--border))` |
| Radius | 8 px (card), 6 px (input) |
