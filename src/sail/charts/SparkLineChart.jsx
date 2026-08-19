import React, { useMemo } from 'react';
import PathGenerator from './paths';
import { buildLineScales, groupBy, buildMetadata } from './utils';

export default function SparkLineChart({
  data,
  x,
  y,
  facet,
  presentation,
  xScaleFormat,
  yScaleFormat,
  id,
  onLineClick,
  onLineHover,
}) {
  const { xScale, yScale } = useMemo(
    () => buildLineScales(data, x, y, { yScaleFormat, xScaleFormat }),
    [data, x, y, yScaleFormat, xScaleFormat]
  );

  const metadata = useMemo(
    () => buildMetadata(data, { facet, presentation }),
    [data, facet, presentation]
  );

  const lines = useMemo(() => {
    if (!data || data.length === 0) return [];
    const result = [];

    if (facet) {
      const groups = groupBy(data, facet);
      for (const [facetValue, facetData] of groups) {
        const entry = metadata.facets.get(facetValue) || {};
        const color = entry.color || metadata.global.color || 'var(--color-chart-1)';
        result.push({ data: facetData, color });
      }
    } else {
      const color = metadata.global.color || 'var(--color-chart-1)';
      result.push({ data, color });
    }
    return result;
  }, [data, x, y, facet, metadata]);

  if (!data || data.length === 0) return <div className="w-full h-full" />;

  return (
    <div className="w-full h-full relative" style={{ aspectRatio: '4 / 1' }}>
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        {lines.map((line, i) => {
          const coords = [];
          for (const d of line.data) {
            coords.push(xScale.plot(d[x]));
            coords.push(d[y] != null ? yScale.plot(d[y]) : null);
          }
          const gen = new PathGenerator();
          gen.line(coords);
          const pathD = gen.toPath();
          if (gen.isEmpty()) return null;

          return (
            <path
              key={i}
              d={pathD}
              fill="none"
              stroke={line.color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ cursor: onLineClick ? 'pointer' : undefined }}
              onClick={onLineClick ? (e) => {
                onLineClick({ chartId: id, eventType: 'sparkline.series.click', data: line.data, nativeEvent: e, meta: { x, y, facet } });
              } : undefined}
              onMouseEnter={onLineHover ? (e) => {
                onLineHover({ chartId: id, eventType: 'sparkline.series.hover', data: line.data, nativeEvent: e, meta: { x, y, facet } });
              } : undefined}
              onMouseLeave={onLineHover ? (e) => {
                onLineHover({ chartId: id, eventType: 'sparkline.series.hover', data: null, nativeEvent: e, meta: { x, y, facet } });
              } : undefined}
            />
          );
        })}
      </svg>
    </div>
  );
}
