# Charts

Lightweight chart components matching the Sail `@sail/charts` API. Pure React + SVG, no external dependencies.

## Import

```jsx
import { LineChart, BarChart, SparkLineChart, SparkBarChart, MeterChart } from '../../../sail';
// or from the charts barrel directly:
import { LineChart, BarChart } from '../../../sail/charts';
```

## Available Charts

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `LineChart` | Time-series / numeric lines | `data`, `x`, `y`, `facet`, `lineSegment`, `confidenceInterval` |
| `BarChart` | Categorical / time bars | `data`, `x`, `y`, `stack`, `group`, `forecast` |
| `SparkLineChart` | Compact inline line | `data`, `x`, `y`, `facet` |
| `SparkBarChart` | Compact inline bars | `data`, `x`, `y`, `stack` |
| `MeterChart` | Proportional horizontal bar | `data`, `segmentName`, `segmentValue` |

## Common Props

All biscalar charts (Line, Bar) share these props:

- **`data`** (array, required) — Array of objects. Each object is a data point.
- **`x`** (string, required) — Key in data for x-axis values (Date, number, or string).
- **`y`** (string, required) — Key in data for y-axis values (number).
- **`presentation`** — Customize series colors/names. Either a global rule `{ color, name }` or array of rules `[{ attribute: 'facet', value: 'Revenue', color: '#9966FF', name: 'Revenue' }]`.
- **`legendEnabled`** (boolean) — Show a legend below the chart.
- **`tooltip`** — Custom tooltip component, or `null` to disable tooltips.
- **`xUnitFormat`** / **`yUnitFormat`** — Format axis/tooltip values: `{ unit: 'currency' | 'percent' | 'time' | 'number' | 'none', options: {...} }`.
- **`xDesiredTickCount`** / **`yDesiredTickCount`** — Preferred number of axis ticks.
- **`id`** (string) — Chart identifier, passed through in event callback payloads.

## LineChart

```jsx
const data = [
  { date: new Date(2024, 0, 1), amount: 4000, category: 'Revenue' },
  { date: new Date(2024, 0, 1), amount: 2000, category: 'Expenses' },
  // ...
];

<LineChart
  data={data}
  x="date"
  y="amount"
  facet="category"                    // groups into multiple lines
  legendEnabled
  xUnitFormat={{ unit: 'time', options: { style: 'short-time' } }}
  yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
/>
```

### Line Segments

Split a single line into styled segments (e.g., solid actual + dashed forecast):

```jsx
<LineChart
  data={data}
  x="date"
  y="amount"
  lineSegment="period"
  presentation={[
    { attribute: 'lineSegment', value: 'actual', lineStyle: 'default' },
    { attribute: 'lineSegment', value: 'forecast', lineStyle: 'dashed' },
  ]}
/>
```

### Confidence Intervals

Render a shaded area between lower/upper bounds:

```jsx
const data = [
  { date: new Date(2024, 0, 1), amount: 4000, lower: 3500, upper: 4500 },
  // ...
];

<LineChart
  data={data}
  x="date"
  y="amount"
  confidenceInterval={{ lower: 'lower', upper: 'upper' }}
/>
```

## BarChart

```jsx
const data = [
  { month: 'Jan', revenue: 5000, region: 'US' },
  { month: 'Jan', revenue: 3000, region: 'EU' },
  // ...
];

// Stacked bars
<BarChart data={data} x="month" y="revenue" stack="region" legendEnabled />

// Grouped bars
<BarChart data={data} x="month" y="revenue" group="region" legendEnabled />
```

### Forecast

Bars with a `forecast` field render lighter with a hatch pattern:

```jsx
const data = [
  { month: 'Jan', revenue: 5000, predicted: null },
  { month: 'Jun', revenue: null, predicted: 6500 },
];

<BarChart data={data} x="month" y="revenue" forecast="predicted" />
```

## SparkLineChart / SparkBarChart

Compact charts for inline display — no axes, no tooltips. Wrap in a sized container:

```jsx
<div className="w-[120px] h-[40px]">
  <SparkLineChart data={data} x="day" y="value" />
</div>

<div className="w-[120px] h-[40px]">
  <SparkBarChart data={data} x="day" y="count" />
</div>
```

## MeterChart

Horizontal proportional bar showing segment breakdown:

```jsx
const data = [
  { method: 'Visa', transactions: 4200 },
  { method: 'Mastercard', transactions: 2800 },
  { method: 'Amex', transactions: 1400 },
];

<MeterChart
  data={data}
  segmentName="method"
  segmentValue="transactions"
  legendEnabled
  unitFormat={{ unit: 'number', options: {} }}
/>
```

## Event Callbacks

All charts support event callbacks that fire on user interactions. Each callback receives a payload object:

```ts
{
  chartId: string,       // The `id` prop (or undefined if not provided)
  eventType: string,     // Event discriminator (e.g. 'line.series.click')
  data: object | null,   // The relevant data point(s), or null on leave
  nativeEvent: Event,    // The DOM event (or null on pointer-leave)
  meta: object,          // Chart dimension props at time of event
}
```

### LineChart

| Prop | Event Type | Data |
|------|-----------|------|
| `onLineClick` | `line.series.click` | All data points in the clicked series |
| `onLineHover` | `line.series.hover` | Series data on enter, `null` on leave |
| `onPointerMove` | `line.pointer.move` | The x-domain value under the pointer |
| `onNeedleHover` | `line.needle.hover` | Array of rows at the snapped x position |

### BarChart

| Prop | Event Type | Data |
|------|-----------|------|
| `onBarClick` | `bar.segment.click` | The single data row matching the clicked bar |
| `onBarHover` | `bar.segment.hover` | Data row on enter, `null` on leave |

### MeterChart

| Prop | Event Type | Data |
|------|-----------|------|
| `onSegmentClick` | `meter.segment.click` / `meter.legend.click` | The data row for the clicked segment |
| `onSegmentHover` | `meter.segment.hover` / `meter.legend.hover` | The data row being hovered |

### SparkLineChart

| Prop | Event Type | Data |
|------|-----------|------|
| `onLineClick` | `sparkline.series.click` | All data points in the clicked series |
| `onLineHover` | `sparkline.series.hover` | Series data on enter, `null` on leave |

### SparkBarChart

| Prop | Event Type | Data |
|------|-----------|------|
| `onBarClick` | `sparkbar.bar.click` | The data row for the clicked bar |
| `onBarHover` | `sparkbar.bar.hover` | Data row on enter, `null` on leave |

### Example

```jsx
<LineChart
  data={data}
  x="date"
  y="amount"
  id="revenue-chart"
  onLineClick={(payload) => {
    console.log('Clicked series:', payload.data);
  }}
  onNeedleHover={(payload) => {
    if (payload.data) {
      console.log('Hovering x-value with', payload.data.length, 'points');
    }
  }}
/>

<BarChart
  data={data}
  x="month"
  y="revenue"
  id="monthly-bar"
  onBarClick={(payload) => {
    console.log('Clicked bar:', payload.data);
  }}
/>

<MeterChart
  data={data}
  segmentName="method"
  segmentValue="transactions"
  id="payments-meter"
  onSegmentClick={(payload) => {
    console.log(payload.eventType, payload.data);
  }}
/>
```

## Color System

Charts use CSS variables `--color-chart-1` through `--color-chart-9` defined in `src/index.css`. These automatically adapt to dark mode. Colors are assigned to series in order by the `ColorManager`.

To override colors, use the `presentation` prop:

```jsx
<LineChart
  presentation={[
    { attribute: 'facet', value: 'Revenue', color: 'var(--color-chart-1)' },
    { attribute: 'facet', value: 'Costs', color: 'var(--color-chart-5)' },
  ]}
/>
```

## Sizing

Charts fill their container. Wrap in a div with explicit height:

```jsx
<div className="w-full h-[300px]">
  <LineChart data={data} x="date" y="amount" />
</div>
```

## Tooltip Behavior

- **Line charts**: A vertical needle line + colored circles appear at the hovered data point. The tooltip follows the cursor Y and is anchored 8px to the right of the needle. Flips to the left only when there isn't enough space on the right.
- **Bar charts**: Hovering dims all non-hovered bar groups (opacity: 0.35). The tooltip X is fixed at the band edge (right of the bar), Y follows cursor. White gaps separate stacked segments.
- Disable tooltips by passing `tooltip={null}`.

## Architecture

- `scales.js` — LinearScale, TimeScale, BandScale (maps data → 0-100 SVG coordinate space). BandScale `plot()` returns the center of each band.
- `paths.js` — PathGenerator (builds SVG `d` attributes)
- `colors.js` — Categorical palette + ColorManager
- `utils.js` — Scale builders, data grouping, metadata, value formatting
- `ChartContainer.jsx` — Shared grid layout (chart SVG + y-axis + x-axis). Tooltip is rendered inside the chart plot area with `overflow: visible` so percentage positions map 1:1 to SVG coordinates.
- `Tooltip.jsx` — Default hover tooltip
- `Legend.jsx` — Series legend
