import React, { useMemo } from 'react';
import { buildBarScales, buildMetadata } from './utils';

export default function SparkBarChart({
  data,
  x,
  y,
  stack,
  presentation,
  id,
  onBarClick,
  onBarHover,
}) {
  const { xScale, yScale } = useMemo(
    () => buildBarScales(data, x, y, { stack }),
    [data, x, y, stack]
  );

  const metadata = useMemo(
    () => buildMetadata(data, { stack, presentation }),
    [data, stack, presentation]
  );

  const bars = useMemo(() => {
    if (!data || data.length === 0) return [];
    const result = [];
    const bandwidth = xScale.bandwidth();
    const barWidth = bandwidth * 0.8;
    const xCategories = xScale.ticks();

    if (stack) {
      for (const xVal of xCategories) {
        const xPos = xScale.plot(xVal) - barWidth / 2;
        const barsAtX = data.filter(d => String(d[x]) === String(xVal));
        let posY = 0;
        for (const d of barsAtX) {
          const val = d[y] ?? 0;
          const stackVal = d[stack];
          const entry = metadata.stacks.get(stackVal) || metadata.global;
          const color = entry.color || 'var(--color-chart-1)';
          const y0 = yScale.plot(posY);
          const y1 = yScale.plot(posY + val);
          result.push({ x: xPos, y0, y1, width: barWidth, color });
          posY += val;
        }
      }
    } else {
      const color = metadata.global.color || 'var(--color-chart-1)';
      for (const xVal of xCategories) {
        const xPos = xScale.plot(xVal) - barWidth / 2;
        const d = data.find(item => String(item[x]) === String(xVal));
        if (!d) continue;
        const val = d[y] ?? 0;
        const y0 = yScale.plot(Math.min(0, val));
        const y1 = yScale.plot(Math.max(0, val));
        result.push({ x: xPos, y0, y1, width: barWidth, color });
      }
    }

    return result;
  }, [data, x, y, stack, xScale, yScale, metadata]);

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
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={100 - bar.y1}
            width={bar.width}
            height={Math.max(0, bar.y1 - bar.y0)}
            fill={bar.color}
            rx="0.3"
            ry="0.3"
            style={{ cursor: onBarClick ? 'pointer' : undefined }}
            onClick={onBarClick ? (e) => {
              onBarClick({ chartId: id, eventType: 'sparkbar.bar.click', data: data[i], nativeEvent: e, meta: { x, y, stack } });
            } : undefined}
            onMouseEnter={onBarHover ? (e) => {
              onBarHover({ chartId: id, eventType: 'sparkbar.bar.hover', data: data[i], nativeEvent: e, meta: { x, y, stack } });
            } : undefined}
            onMouseLeave={onBarHover ? (e) => {
              onBarHover({ chartId: id, eventType: 'sparkbar.bar.hover', data: null, nativeEvent: e, meta: { x, y, stack } });
            } : undefined}
          />
        ))}
      </svg>
    </div>
  );
}
