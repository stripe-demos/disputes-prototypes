import { LinearScale, TimeScale, BandScale } from './scales';
import { ColorManager } from './colors';

export function buildLineScales(data, x, y, { yScaleFormat, xScaleFormat } = {}) {
  if (!data || data.length === 0) return { xScale: new LinearScale(), yScale: new LinearScale() };

  const xValues = data.map(d => d[x]).filter(v => v != null);
  const yValues = data.map(d => d[y]).filter(v => v != null);

  let xScale;
  if (xValues[0] instanceof Date) {
    xScale = new TimeScale();
    xScale.domain([new Date(Math.min(...xValues.map(d => d.getTime()))), new Date(Math.max(...xValues.map(d => d.getTime())))]);
  } else {
    xScale = new LinearScale();
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    xScale.domain([xMin, xMax]);
  }

  const yMin = Math.min(0, ...yValues);
  const yMax = Math.max(...yValues);
  const yScale = new LinearScale();
  yScale.domain([yMin, yMax]);
  yScale.nice(true);

  if (yScaleFormat === 'exact') {
    yScale.nice(false);
    yScale.domain([Math.min(...yValues), Math.max(...yValues)]);
  } else if (yScaleFormat?.domain) {
    const d = yScale.domain();
    if (yScaleFormat.domain.min != null) d[0] = yScaleFormat.domain.min;
    if (yScaleFormat.domain.max != null) d[1] = yScaleFormat.domain.max;
    yScale.domain(d);
  }

  return { xScale, yScale };
}

export function buildBarScales(data, x, y, { stack, group, yScaleFormat } = {}) {
  if (!data || data.length === 0) return { xScale: new BandScale(), yScale: new LinearScale() };

  const xValues = [...new Set(data.map(d => d[x]).filter(v => v != null))];
  let xScale;
  if (xValues[0] instanceof Date) {
    xScale = new BandScale();
    xScale.domain(xValues.sort((a, b) => a.getTime() - b.getTime()));
  } else if (typeof xValues[0] === 'number') {
    xScale = new BandScale();
    xScale.domain(xValues.sort((a, b) => a - b));
  } else {
    xScale = new BandScale();
    xScale.domain(xValues);
  }

  let yMax = 0;
  let yMin = 0;

  if (stack) {
    const grouped = new Map();
    for (const d of data) {
      const key = String(d[x]);
      if (!grouped.has(key)) grouped.set(key, { pos: 0, neg: 0 });
      const acc = grouped.get(key);
      const val = d[y] ?? 0;
      if (val >= 0) acc.pos += val;
      else acc.neg += val;
    }
    for (const { pos, neg } of grouped.values()) {
      yMax = Math.max(yMax, pos);
      yMin = Math.min(yMin, neg);
    }
  } else {
    const yValues = data.map(d => d[y]).filter(v => v != null);
    yMax = Math.max(0, ...yValues);
    yMin = Math.min(0, ...yValues);
  }

  const yScale = new LinearScale();
  yScale.domain([yMin, yMax]);
  yScale.nice(true);

  if (yScaleFormat === 'exact') {
    yScale.nice(false);
  } else if (yScaleFormat?.domain) {
    const d = yScale.domain();
    if (yScaleFormat.domain.min != null) d[0] = yScaleFormat.domain.min;
    if (yScaleFormat.domain.max != null) d[1] = yScaleFormat.domain.max;
    yScale.domain(d);
  }

  return { xScale, yScale };
}

export function groupBy(data, key) {
  const map = new Map();
  for (const d of data) {
    const k = d[key] ?? '__default__';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(d);
  }
  return map;
}

export function buildMetadata(data, { facet, stack, group, presentation }) {
  const colorMgr = new ColorManager();
  const meta = { global: {}, facets: new Map(), stacks: new Map(), groups: new Map() };

  if (presentation && !Array.isArray(presentation)) {
    meta.global = { ...presentation };
  }

  if (Array.isArray(presentation)) {
    for (const rule of presentation) {
      if (rule.attribute === 'facet') meta.facets.set(rule.value, { name: rule.name, color: rule.color, lineStyle: rule.lineStyle });
      if (rule.attribute === 'stack') meta.stacks.set(rule.value, { name: rule.name, color: rule.color });
      if (rule.attribute === 'group') meta.groups.set(rule.value, { name: rule.name, color: rule.color });
      if (rule.attribute === 'lineSegment') {
        if (!meta.lineSegments) meta.lineSegments = new Map();
        meta.lineSegments.set(rule.value, { name: rule.name, lineStyle: rule.lineStyle });
      }
    }
  }

  if (facet) {
    const facetValues = [...new Set(data.map(d => d[facet]).filter(v => v != null))];
    for (const v of facetValues) {
      if (!meta.facets.has(v)) meta.facets.set(v, {});
      const entry = meta.facets.get(v);
      if (!entry.color) entry.color = colorMgr.get(v);
      if (!entry.name) entry.name = String(v);
    }
  }

  if (stack) {
    const stackValues = [...new Set(data.map(d => d[stack]).filter(v => v != null))];
    for (const v of stackValues) {
      if (!meta.stacks.has(v)) meta.stacks.set(v, {});
      const entry = meta.stacks.get(v);
      if (!entry.color) entry.color = colorMgr.get(v);
      if (!entry.name) entry.name = String(v);
    }
  }

  if (group) {
    const groupValues = [...new Set(data.map(d => d[group]).filter(v => v != null))];
    for (const v of groupValues) {
      if (!meta.groups.has(v)) meta.groups.set(v, {});
      const entry = meta.groups.get(v);
      if (!entry.color) entry.color = colorMgr.get(v);
      if (!entry.name) entry.name = String(v);
    }
  }

  if (!meta.global.color && !facet && !stack && !group) {
    meta.global.color = colorMgr.getByIndex(0);
  }

  return meta;
}

export function formatValue(value, unitFormat) {
  if (value == null) return '';
  if (!unitFormat) {
    if (value instanceof Date) return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  }

  const { unit, options = {} } = unitFormat;
  switch (unit) {
    case 'currency':
      return new Intl.NumberFormat(undefined, { style: 'currency', ...options }).format(value);
    case 'percent':
      return new Intl.NumberFormat(undefined, { style: 'percent', ...options }).format(value);
    case 'number':
      return new Intl.NumberFormat(undefined, options).format(value);
    case 'time':
      if (value instanceof Date) {
        const style = options.style || 'medium';
        const dateOpts = style === 'short-time' ? { month: 'short', day: 'numeric' }
          : style === 'medium' ? { month: 'short', day: 'numeric', year: 'numeric' }
          : { month: 'long', day: 'numeric', year: 'numeric' };
        return new Intl.DateTimeFormat(undefined, dateOpts).format(value);
      }
      return String(value);
    case 'none':
      return String(value);
    default:
      return String(value);
  }
}

export function buildLegendData(meta, { facet, stack, group }) {
  const items = [];
  if (facet && meta.facets.size > 0) {
    for (const [value, entry] of meta.facets) {
      items.push({ id: value, name: entry.name || String(value), color: entry.color, shape: 'line' });
    }
  } else if (stack && meta.stacks.size > 0) {
    for (const [value, entry] of meta.stacks) {
      items.push({ id: value, name: entry.name || String(value), color: entry.color, shape: 'bar' });
    }
  } else if (group && meta.groups.size > 0) {
    for (const [value, entry] of meta.groups) {
      items.push({ id: value, name: entry.name || String(value), color: entry.color, shape: 'bar' });
    }
  }
  return items;
}
