# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start development server at localhost:5173
npm run build            # Production build to dist/
npm run preview          # Preview production build locally
npm run lint             # ESLint check
npm run create-prototype # Scaffold a new prototype (see below)
```

## Architecture

Stripe-style dashboard shell built with React 19, Vite 7, and Tailwind CSS 4. Supports multiple independent prototypes, each with its own pages, data, control panel, and routing.

### Multi-Prototype Structure

```
src/
  App.jsx                    # Root shell: routes to prototypes, conditionally shows PrototypeList
  PrototypeList.jsx          # Full page listing all prototypes (shown at / when multiple exist)
  contexts/
    BasePath.jsx             # BasePathContext + useBasePath hook (for routing)
  sail/                      # Shared Sail components
    ControlPanel.jsx         # Exports primitives only (no default export)
    Sidebar.jsx              # Sidebar shell (accepts children) + NavItem/SubNavItem/ExpandableNavItem
    Header.jsx               # Header, SandboxBanner, SANDBOX_HEIGHT, ACCOUNT_NAME
    SetupGuide.jsx           # Floating setup guide panel with collapsible sections + optional intro
    assets/
      blur-gradient.png      # Gradient backdrop image used by SetupGuide intro
    ...
  charts/                    # Chart components (see CHARTS.md in that folder for full API docs)
    index.js                 # Barrel export — LineChart, BarChart, SparkLineChart, SparkBarChart, MeterChart, FunnelChart
    CHARTS.md                # Detailed usage guide for LLMs
  docs/                      # Shared docs components (for stripe-docs template)
    index.js                 # Barrel export
    components/
      DocsHeader.jsx         # Docs header with Stripe Docs logo, search, nav tabs
      DocsSidebar.jsx        # Left sidebar — accepts `sections` prop (parsed YAML data)
      DocsTOC.jsx            # Right-side table of contents with IntersectionObserver
      DocsLayout.jsx         # Flex layout: header + sidebar + scrollable content
      DocsPage.jsx           # Shared page component — renders any .md file with standard layout
    markdoc/
      config.js              # Markdoc schema (node overrides + custom tags)
      components.jsx         # React components for markdoc nodes
      MarkdocRenderer.jsx    # Parse/transform/render pipeline + frontmatter + TOC extraction
  prototypes/
    index.js                 # Auto-discovery registry using import.meta.glob
    config.json              # All prototype metadata { id: { name, description, status, default? } }
    prototype1/              # Default prototype (Dashboard Shell)
      App.jsx                # Layout + routes + state (receives basePath prop from root)
      SidebarNav.jsx         # Prototype-specific sidebar navigation content
      HeaderNav.jsx          # Prototype-specific header action buttons
      ControlPanel.jsx       # Prototype-specific controls (uses useNavigate for prototype switching)
      pages/                 # Page components
      data/                  # Data files
scripts/
  create-prototype.js        # Interactive scaffold script
  templates/
    index.js                 # Template registry (TEMPLATES, getTemplate, getNextId)
    dashboard-shell.js       # Full dashboard template generator
    empty.js                 # Empty page template generator (no sidebar/header)
vite-plugin-prototype-api.js # Dev server API for UI-based prototype CRUD
```

Every prototype gets a `/:id/*` route prefix (e.g. `/prototype1/balances`). `/` always renders the `PrototypeList` page. The root `App.jsx` passes `basePath` as a prop to each prototype.

### Creating a New Prototype

**If the user asks to create a new prototype, run `npm run create-prototype`** — do not manually create the files. The script handles ID assignment, directory scaffolding, and config updates. Pass `--name`, `--description`, and `--template` as CLI args (or omit them for interactive prompts).

```bash
npm run create-prototype -- --name "My Prototype" --description "A description" --template dashboard-shell
npm run create-prototype    # Interactive mode: prompts for name, description, and template
```

Available templates: `dashboard-shell` (full dashboard with sidebar, header, control panel, two pages), `empty` (blank page — no sidebar, header, or shell), and `stripe-docs` (documentation page with markdoc, sidebar navigation, and table of contents).

The script creates the prototype directory and appends to `src/prototypes/config.json`. IDs are always numeric (`prototype2`, `prototype3`, etc.). No registry modification needed — `import.meta.glob` auto-discovers new directories.

Prototypes can also be created, edited, and deleted from the UI during development. The prototype list page (`/`) shows a "Create prototype" button and edit icons on each row (dev mode only, gated behind `import.meta.env.DEV`). The edit dialog allows changing name, description, status, and deleting. These controls use API endpoints provided by the Vite plugin in `vite-plugin-prototype-api.js`:

- `GET /__api/templates` — list available templates
- `POST /__api/prototypes` — create (`{ name, description, template }`)
- `PATCH /__api/prototypes/:id` — update (`{ name?, description?, status? }`)
- `DELETE /__api/prototypes/:id` — delete (blocked for last prototype)

**If the user asks to delete a prototype, delete its `src/prototypes/<id>/` directory AND remove its entry from `src/prototypes/config.json`.** Both steps are required — a stale config entry will cause build errors.

### Layout Structure

The layout uses fixed positioning with a max-width constraint:
- **Sidebar**: 250px fixed left (`w-sidebar-width`), uses `bg-surface`
- **Header**: 60px fixed top, content constrained to `max-w-[1280px]`, uses `bg-surface`
- **Content**: Scrollable area with `max-w-[1280px]` centered

Both header and content share the same max-width so they align visually.

### Key Files

- **`src/App.jsx`**: Root shell — routes each prototype at `/:id/*`, passes `basePath` prop, shows `PrototypeList` at `/` when multiple prototypes exist
- **`src/prototypes/config.json`**: Single config for all prototypes — name, description, status (`active`/`archived`), and `default` flag
- **`src/prototypes/index.js`**: Auto-discovery registry via `import.meta.glob`, reads from shared `config.json`
- **`src/sail/Sidebar.jsx`**: Sidebar shell (accepts `children`), NavItem, SubNavItem, SectionHeading, ExpandableNavItem — each prototype defines its own sidebar nav content as children. `NavItem`/`SubNavItem` resolve paths internally via `useBasePath()` (pass relative `to` like `"balances"`, not absolute)
- **`src/sail/Header.jsx`**: Header (accepts `children` for per-prototype action buttons), HeaderButton, SandboxBanner, SANDBOX_HEIGHT, ACCOUNT_NAME
- **`src/sail/ControlPanel.jsx`**: Shared primitives (`ControlPanelButton`, `ControlPanelHeader`, `ControlPanelBody`, `useDragSnap`, `DropZone`, `MARGIN`, `PANEL_WIDTH`, `InfoBanner`, `ContextDialog`) — no default export. `useDragSnap` tracks `--workbench-height` CSS property via MutationObserver and returns `bottomOffset` and `bottomExpr` for workbench-aware positioning
- **`src/sail/SetupGuide.jsx`**: Floating setup guide panel (bottom-right). Accepts `sections` array, `onItemClick` callback, optional `intro` (`{ heading, body }`) for gradient backdrop + text beside the panel. Sections support `locked` (shows lock icon, hides items) and `collapsible` (default true). Completion state is controlled by the parent via the `sections` prop. Workbench-aware via `--workbench-height` CSS property
- **`src/sail/Workbench.jsx`**: Developer tools panel fixed to bottom of screen. Accepts `tabs` array (`{ key, label, content }`), `defaultOpen`, `maxHeight`, `className`. Features: drag-to-resize, fullscreen toggle, tab system, URL state via single `workbench` param (`?workbench=show` or `?workbench=fullscreen`), plus one-shot `?workbench-tab=<key>` for deep-linking. `maxHeight` controls the fullscreen ceiling (parent passes viewport minus banner height). Sets `--workbench-height` CSS property via ResizeObserver for other fixed elements to track. Exports `WORKBENCH_BAR_HEIGHT` (48) and `WORKBENCH_PANEL_HEIGHT` (500)
- **`src/contexts/BasePath.jsx`**: `BasePathContext` + `useBasePath()` hook for prototype-aware routing
- **`src/icons/SailIcons.jsx`**: SVG icon system with sizes: xxsmall(12px)/xsmall(14px)/small(16px)/medium(20px)/large(24px)
- **`src/index.css`**: Tailwind CSS 4 `@theme` block with all color tokens + dark mode overrides
- **`vite-plugin-prototype-api.js`**: Vite dev server plugin — REST endpoints for prototype CRUD, triggers full-reload after file changes
- **`scripts/templates/index.js`**: Template registry — `TEMPLATES` metadata array, `getTemplate(id)` returns generator function, `getNextId()` computes next prototype ID

### Typography

**Always use the custom `@utility` text styles** defined in `src/index.css` instead of default Tailwind text classes like `text-sm`, `text-xs`, `text-base`, `text-lg`, etc. Never use `font-semibold` or `font-medium` alongside text utilities — use the `-emphasized` or `-subdued` variant instead.

| Category | Utilities |
|----------|-----------|
| Display | `text-display-xlarge`, `text-display-large`, `text-display-medium`, `text-display-small` (+ `-subdued` variants) |
| Heading | `text-heading-xlarge` through `text-heading-xsmall` (+ `-subdued` variants) |
| Body | `text-body-large`, `text-body-medium`, `text-body-small` (+ `-emphasized` variants) |
| Label | `text-label-large`, `text-label-medium`, `text-label-small` (+ `-emphasized` variants) |

### Breakpoints

Custom breakpoints are defined in `src/index.css` — do not use default Tailwind breakpoints (`sm:`, `md:`, `lg:`, etc.).

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `xsmall:` | 0px | Base |
| `small:` | 490px | Small screens |
| `medium:` | 768px | Tablets |
| `large:` | 1040px | Desktops |
| `xlarge:` | 1440px | Wide screens |

### Theming

**Always use semantic color tokens** from `src/index.css` instead of hardcoded values like `gray-500` or `#ccc`. This is critical for dark mode support — hardcoded colors will not adapt.

| Token | Usage |
|-------|-------|
| `bg-surface` | Page background |
| `bg-offset` | Offset sections, hover states |
| `bg-blurple` | Brand purple |
| `text-default` | Primary text |
| `text-subdued` | Secondary text |
| `text-brand` | Brand purple text |
| `border-border` | Standard borders |

Additional tokens exist for buttons (`button-primary-*`, `button-secondary-*`), badges (`badge-success-*`, `badge-warning-*`, etc.), and icons (`icon-default`, `icon-subdued`, `icon-brand`).

### Dark Mode

Dark mode is managed at each prototype's App level via a `darkMode` state boolean. When active, a `dark` CSS class is applied to the root div, which overrides all `--color-*` custom properties in `src/index.css`. The `body:has(.dark)` rule in CSS ensures the body background also updates.

**Never use `bg-white` or other non-token colors** in components — use `bg-surface` instead so dark mode works correctly.

### Prototype Control Panel

`src/sail/ControlPanel.jsx` exports shared primitives for building per-prototype control panels:

- **Primitives**: `ControlPanelButton`, `ControlPanelHeader`, `ControlPanelBody`
- **Drag system**: `useDragSnap()`, `DropZone`, `MARGIN`, `PANEL_WIDTH`
- **Sections**: `InfoBanner`, `ContextDialog`

Each prototype has its own `ControlPanel.jsx` that composes these primitives. The panel uses `z-[100]`. The context dialog uses `overlayClassName="z-[101]"` to appear above the panel.

### Component Library

Import UI components from the barrel file (`src/sail/index.js`) instead of individual files:

```jsx
import { Button, Badge, Dialog, Input, Table } from '../../../sail';
```

Available components:
- **Button**: `variant` (primary/secondary/danger), `size` (sm/md/lg), `icon`
- **Badge**: `variant` (default/success/warning/danger/info)
- **Chip**: Filter pill that toggles a dropdown panel — `label`, `displayValue`, `renderDropdown` (receives `{ ref, anchorRef, onClose }`). Supports controlled open state (`isOpen`/`onOpenChange`), `className`, `size` (`sm`/`md`). Also exports `FilterChip` (named) which composes Chip + SelectDropdown — `label`, `options`, `value`, `onChange`, `variant` (`single`/`multi`), `searchable`, `searchPlaceholder`
- **Dialog**: `size` (small/medium/large/xlarge/full), `overlayClassName` for z-index control
- **SelectDropdown**: Unified dropdown (portaled at `z-[200]`) — `variant` (`single`/`multi`), `options` (`[{ value, label, icon? }]`), `searchable`, `searchPlaceholder`, `anchorRef`. `COUNTRIES` data is in `src/data/countries.js` (re-exported from SelectDropdown for backwards compat)
- **DateRangePicker**: Dual calendar with presets sidebar (portaled at `z-[200]`) — `value`, `onChange`, `onClose`, `anchorRef`
- **Input, Textarea, Select, Checkbox, Radio**: Form controls with `label`, `description`, `error`, `errorMessage`
- **Switch**: Toggle with `checked`, `onChange`, `label`
- **Table**: `columns` (with `key`, `header`, `render`, `width`), `data`, `onRowClick`, `isLoading`
- **Toggle/ToggleGroup**: Card-style selectors with `selected`, `layout` (vertical/horizontal)
- **Tooltip**: `placement` (top/bottom/left/right), `variant` (default/minimal)
- **SetupGuide**: Floating setup guide panel (bottom-right corner). `sections` (`[{ id, title, collapsible?, locked?, items: [{ id, label, complete }] }]`), `onItemClick(itemId, sectionId)`, `title` (default: "Setup guide"), `defaultExpandedSection`, `visible`, `intro` (`{ heading, body }` — shows text beside the guide with a gradient backdrop; omit to hide)

### Dropdown Positioning

All portaled dropdowns (`SelectDropdown`, `DateRangePicker`) use `useDropdownPosition` from `src/sail/useDropdownPosition.js`. This hook:
- Positions the dropdown relative to an `anchorRef` element
- Dynamically flips above/below and left/right on scroll when the dropdown gets clipped (with 20px hysteresis to prevent jitter)
- Updates position on scroll (any ancestor), window resize, and dropdown resize (via ResizeObserver)
- Renders via `ReactDOM.createPortal` at `z-[200]` so dropdowns always appear above dialogs (`z-50`)

### Adding New Pages

1. Create page file in `src/prototypes/<id>/pages/`
2. Import and add route in `src/prototypes/<id>/App.jsx`
3. Add NavItem/SubNavItem to the prototype's `SidebarNav` component in its `App.jsx` with a relative `to` prop (e.g. `to="balances"`) — the component resolves it to an absolute path internally
4. Import shared components via barrel: `import { Button, Badge } from '../../../sail'` and icons from `../../../icons/`

### Routing & BasePath

- The root `App.jsx` passes `basePath` (e.g. `"/prototype1"`) as a prop to each prototype's App component — **do not use `useResolvedPath`** (it has a known bug with splat routes in React Router 7)
- Each prototype's App wraps its content in `<BasePathContext.Provider value={basePath}>`
- `NavItem` and `SubNavItem` call `useBasePath()` internally to build absolute links — callers just pass relative segments like `to="balances"`
- Pages that need absolute paths (breadcrumbs, programmatic navigation) should use `useBasePath()` from `../../../contexts/BasePath`

### Docs Infrastructure (`src/docs/`)

The `src/docs/` folder contains shared components for documentation prototypes (used by the `stripe-docs` template). Import from the barrel file:

```jsx
import { DocsLayout, DocsTOC, MarkdocRenderer, useMarkdocFrontmatter, useMarkdocToc } from '../../docs';
```

**Key components:**
- **`DocsLayout`**: Flex layout with docs header + sidebar + scrollable content. Accepts `sections` (parsed YAML sidebar data), `activeTab` (header tab to highlight), and `children`
- **`DocsSidebar`**: Collapsible sidebar navigation — accepts `sections` prop. Uses React Router `<Link>` for items with real `href` values and auto-detects active state from the current URL
- **`DocsTOC`**: Right-side table of contents with scroll-spy via IntersectionObserver. Accepts `items` (`[{ id, label, depth }]`). Uses `sticky` positioning inside the scrollable content area
- **`DocsHeader`**: Docs header with Stripe Docs logo, search bar, and navigation tabs. Accepts `activeTab` prop (string matching a tab label, e.g. `"Payments"`)
- **`MarkdocRenderer`**: Renders markdoc content string to React. Supports custom tags: `callout`, `link`
- **`useMarkdocFrontmatter(content)`**: Extracts frontmatter (title, subtitle, breadcrumbs) from raw markdown
- **`useMarkdocToc(content)`**: Extracts heading structure for TOC

**Content-driven routing** — sidebar items declare a `content` field pointing to a `.md` file. The route path is auto-derived from the filename (e.g. `content: quickstart.md` → route `/quickstart`). A shared `DocsPage` component renders any markdown file with the standard docs layout (breadcrumbs, title, subtitle, meta row, markdoc body, TOC). **No per-page JSX files needed** — just write markdown.

**Adding a new page:**

1. Create a `.md` file in `content/` with frontmatter (title, subtitle, optional breadcrumbs)
2. Add `content: your-file.md` to a sidebar item in `content/sidebar.yaml`
3. The route is auto-derived from the filename — no `href` needed

**Sidebar YAML format** — each prototype has a `content/sidebar.yaml`:

```yaml
sections:
  - heading: null              # null for no heading, or a string
    items:
      - label: Overview
        content: getting-started.md  # route: /getting-started (auto-derived)
        default: true                # landing page — /prototype2 redirects here
      - label: Sample page
        content: sample-page.md      # route: /sample-page (auto-derived)
      - label: Get started
        children:                    # no content = decorative (expand/collapse only)
          - label: Quickstart
            content: quickstart.md   # route: /quickstart
          - label: Docs
            href: "#"                # "#" = placeholder, no routing
```

**Sidebar behavior:**
- `content: file.md` → auto-derives route from filename, creates `<Route>` and React Router `<Link>`, active state from URL
- `content: file.md` + `href: custom-path` → uses explicit href instead of auto-derived path
- `default: true` → the base URL (e.g. `/prototype2`) redirects to this item's route
- `href: "#"` or no `content`/`href` → plain `<a>`, decorative (expand/collapse parents)
- `href: "https://..."` → external link
- `active: true` → manual override for active state (optional, auto-detected when using routes)
- Top-level parent items auto-bold when any descendant is active

**Markdoc content** — markdown files with frontmatter in `content/`. Each `.md` file is auto-discovered and rendered by `DocsPage`:

```markdown
---
title: Page Title
subtitle: A brief description.
breadcrumbs:
  - label: Documentation
  - label: Get started
---

Your markdoc content here...
```

### Tech Stack

- React 19 with React Router 7
- Vite 7 with `@tailwindcss/postcss` plugin
- Tailwind CSS 4
