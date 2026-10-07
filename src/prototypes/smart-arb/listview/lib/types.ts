// ─── Listview template type definitions ──────────────────────────────────────

export interface StatusStyle {
  background: string;
  color: string;
  outline: string;
}

/**
 * Defines a single column in the table.
 *
 * `id`   — unique key; also used as the primary data lookup key (`row[id]`).
 * `type` — which renderer to use. Maps to the switch cases in TableRow.
 *          For M1.5, `type === id` for every column. Future pages can have
 *          `id: 'amount'`, `type: 'currency'` etc.
 */
/** S / M / L shorthand for column default widths: 160 / 200 / 240 px. */
export const COLUMN_SIZE_PX = { S: 160, M: 200, L: 240 } as const;
/**
 * S / M / L — fixed pixel starting widths.
 * Fit     — column starts at auto width (sized to largest cell content);
 *           once the user drags to resize it becomes a fixed pixel width.
 */
export type ColumnSize = keyof typeof COLUMN_SIZE_PX | 'Fit';

export interface ColumnDef {
  id: string;
  type: string;
  label: string;
  align?: 'left' | 'right';
  /**
   * Explicit pixel width. Takes precedence over `defaultSize`.
   * Prefer `defaultSize` for standard columns; use this only for custom widths.
   */
  defaultWidth?: number;
  /**
   * S / M / L sizing shorthand (160 / 200 / 240 px).
   * Ignored when `defaultWidth` is also set.
   * Defaults to M (200 px) when neither is specified.
   */
  defaultSize?: ColumnSize;
  /** If false, hidden in initial state. Defaults to true. */
  defaultVisible?: boolean;
  /** colSpan rendered in <th>/<td>. E.g. currency = 2 (value + code cells). */
  colSpan?: number;
  /** Icon path for icon-box, inline-icon, brand-icon, location column types. */
  iconSrc?: string;
  /** Secondary icon path shown before the primary icon in brand-icon columns (2-icon state). */
  secondaryIconSrc?: string;
  /**
   * When true, this column is a user-defined metadata column and shows a
   * "Metadata" badge in the table settings panel.
   * Metadata columns use the 'basic-text' column type when displayed in the table.
   */
  isMetadata?: boolean;
  /** Status label → badge style map for the 'status' column type.
   *  Any status not in the map falls back to the neutral grey style. */
  statusMap?: Record<string, StatusStyle>;
  /** Named data-field overrides for multi-field column types.
   *  Keys are renderer-specific (e.g. 'code', 'positive', 'list', 'amount', 'sub'). */
  dataKeys?: Record<string, string>;
  /** Whether this column is included in the global fuzzy-search. */
  searchable?: boolean;
  /**
   * Available filter options for this column shown in the filter menu.
   * Pass an empty array `[]` to show the column in the filter menu with no options.
   * Omit (undefined) to hide the column from the filter menu entirely.
   */
  filterOptions?: string[];
}

// ─── Filter definitions ───────────────────────────────────────────────────────

/**
 * A filter definition for a tab. Filters are independent of columns — they can
 * reference any field in the row data, or exist purely for UI prototyping.
 *
 * Four types are supported, each rendering a different subpage in the filter menu:
 *   date         — operator dropdown + number input + unit dropdown + timezone radios
 *   single-select — single dropdown that picks one value
 *   multi-select  — scrollable checkbox list (multiple values)
 *   value         — operator dropdown + free-text input
 */
export type FilterDef =
  | { id: string; label: string; type: 'date' }
  | { id: string; label: string; type: 'single-select'; options: string[] }
  | { id: string; label: string; type: 'multi-select';  options: string[] }
  | { id: string; label: string; type: 'value' };

/**
 * A pre-configured filter applied when a view chip is selected.
 * Shape mirrors the internal FilterChip — `id` must match a FilterDef id.
 */
export interface ViewChipFilter {
  /** Must match the corresponding FilterDef id (used for row data lookup). */
  id: string;
  /**
   * Display label shown in the filter chip. When omitted, the template
   * automatically resolves it from the matching FilterDef label.
   */
  filterName?: string;
  filterType: 'single-select' | 'multi-select' | 'date' | 'value';
  selectedValues?: string[];
  dateOp?: string;
  dateVal?: string;
  dateUnit?: string;
  dateTz?: string;
  valueOp?: string;
  valueInput?: string;
}

export interface ViewChipConfig {
  id: string;
  label: string;
  count?: string;
  /** Filters that are pre-applied when this chip is selected. */
  filters?: ViewChipFilter[];
  /**
   * Default visible column IDs (in display order) for this view.
   * Applied when the chip is first selected and no user-saved column state exists.
   */
  columns?: string[];
  /** Default sort column ID for this view. */
  sortCol?: string | null;
  /** Default sort direction for this view. Defaults to 'asc'. */
  sortDir?: 'asc' | 'desc';
}

export interface RowAction {
  label: string;
  /** CSS color string for the label text. */
  color: string;
  /**
   * When set, this item starts a new named group. A divider + group label will be
   * rendered before this item in the popover.
   */
  group?: string;
}

/**
 * A button rendered in the page header action area (right of export/analyze icons).
 * Uses the same secondary button style as the create button, but without an icon.
 */
export interface PageAction {
  label: string;
  /**
   * When set, this item starts a new named group. A divider + group label will be
   * rendered before this item in the overflow popover.
   */
  group?: string;
}

/** A description column, optionally preceded by fixed text (e.g. "Arrives by"). */
export interface MobileRowField {
  column: string;
  prefix?: string;
}

/**
 * Fields shown when the table collapses to a list at the mobile breakpoint.
 * Every column reference is a column ID from the tab's `columns`.
 */
export interface MobileRowConfig {
  /** List header label above the titles (e.g. "Payment"). Defaults to the title column's label. */
  label?: string;
  /** Emphasized first line of the row. Media column types (icon-box, image, app-icon) also render their thumbnail. */
  title: string;
  /** Subdued second line. Multiple fields are separated by a vertical divider. */
  description?: (string | MobileRowField)[];
  /** Trailing value on the right side of the row (e.g. a status badge or amount). Its column label heads the right side of the list. */
  right?: string;
}

/**
 * Per-tab configuration: all the data and column definitions for a single tab.
 * A page with a single tab renders no tab bar.
 */
export interface TabConfig {
  /** Stable tab identifier — used to namespace localStorage keys. */
  tabId: string;
  /** Tab bar label. Ignored if the page has only one tab. */
  label: string;
  /** Column definitions — order here = default column order. */
  columns: ColumnDef[];
  /**
   * Explicit filter definitions for this tab. When provided, overrides the
   * column-derived filter list (columns with `filterOptions` defined).
   * Use this to define filters that are independent of the visible columns,
   * or to specify the exact filter type (date / single-select / multi-select / value).
   */
  filters?: FilterDef[];
  /** Row data. Can be any record shape — renderers access fields by column id. */
  data: Record<string, unknown>[];
  /**
   * Optional sort / column overrides for the auto-generated "All" chip.
   * The "All" chip is always present and always first — this lets a tab
   * configure its default sort direction or visible column set without
   * placing an 'all' entry inside defaultViewChips.
   */
  allViewConfig?: {
    sortCol?: string | null;
    sortDir?: 'asc' | 'desc';
    columns?: string[];
  };
  /**
   * Named view chips shown after "All". Never include an 'all' entry here —
   * use allViewConfig instead.
   * Defaults to three generic "Pre-defined view" chips when omitted.
   */
  defaultViewChips?: ViewChipConfig[];
  /**
   * Default view IDs that remain immutable in the "Partial Locked" view-management
   * prototype. The generated "All" view is always locked and should not be listed.
   */
  lockedViewIds?: string[];
  /** Which chip IDs are pinned on first load. Defaults to all chip IDs. */
  defaultPinnedIds?: string[];
  /**
   * Label for the primary "Create" action button in the page header.
   * Defaults to "Create" if omitted.
   * Examples: "Create product", "Create payment", "Add customer"
   */
  createActionLabel?: string;
  /** Actions shown in the per-row "more" menu. */
  rowActions?: RowAction[];
  /**
   * Fields shown in the mobile list. When omitted, the first column is the title,
   * the next non-status column is the description, and the first status column is the right slot.
   */
  mobileRow?: MobileRowConfig;
  /**
   * When true, the tab shows a placeholder empty state instead of the table.
   * Use for tabs that haven't been built out yet.
   */
  placeholder?: boolean;
  /**
   * For the bulk-action "Refund N selected" count:
   * field name + value that makes a row refundable.
   * Defaults to field='status', value='Active'.
   */
  refundableField?: string;
  refundableValue?: string;
  /**
   * When false, hides the leading row checkbox column and bulk-select behavior.
   * Defaults to true.
   */
  bulkSelectCheckboxes?: boolean;
  /**
   * When true, suppresses the engine's default "Add your first <thing>"
   * placeholder copy, rendering a plain blank page instead. Only has an
   * effect when `placeholder` is also true.
   */
  blank?: boolean;
  /**
   * Custom content to render in place of the table for a `blank` tab
   * (e.g. a hand-built settings/empty-state page for a tab that isn't a
   * data table). Only used when `blank` is also true.
   */
  content?: import('react').ReactNode;
}

/**
 * Top-level page config. Contains metadata and one or more tabs.
 * If `tabs` has exactly one entry, no tab bar is rendered.
 */
export interface PageConfig {
  /** Stable page identifier — used to namespace localStorage keys. */
  pageId: string;
  /** Displayed as the <h1> at the top of the page. */
  pageTitle: string;
  /**
   * Optional breadcrumb shown above the page title.
   * When `href` is provided the label is rendered as a link; otherwise plain text.
   */
  breadcrumb?: { label: string; href?: string };
  /**
   * Additional action buttons shown in the page header, to the left of the
   * primary create button. Rendered with the same secondary button style.
   * Unlike createActionLabel (which is per-tab), these are page-level.
   */
  pageActions?: PageAction[];
  /**
   * When set, shows a compact copy-ID chip in the page header immediately to the
   * left of More / Analyze / Export and other header actions (List Views pattern).
   */
  pageCopyId?: string;
  /**
   * Tab configurations. Use a single-element array for pages without a tab bar.
   * Multi-tab pages show a tab bar; each tab has its own independent table state.
   */
  tabs: TabConfig[];
  /**
   * When true, the search bar is hidden and the chip row / saved views layout
   * shifts into the compact "no-search" horizontal scroll mode.
   * Defaults to false.
   */
  noSearch?: boolean;
  /**
   * When true, the filter popover shows a "Search filters" field.
   * Defaults to false.
   */
  filterSearch?: boolean;
  /**
   * When false, row counts are hidden from view chips and the views popover.
   * Defaults to true.
   */
  includeViewTotals?: boolean;
}
