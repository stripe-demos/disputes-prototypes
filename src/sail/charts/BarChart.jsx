import React, { useMemo, useState, useCallback, useRef } from 'react';
import ChartContainer from './ChartContainer';
import DefaultTooltip from './Tooltip';
import Legend from './Legend';
import { buildBarScales, groupBy, buildMetadata, formatValue, buildLegendData } from './utils';

function forecastColor(color) {
  return `color-mix(in srgb, ${color} 18%, var(--color-surface) 82%)`;
}

export default function BarChart({
  data,
  x,
  y,
  stack,
  group,
  forecast,
  confidenceInterval,
  xUnitFormat,
  yUnitFormat,
  yScaleFormat,
  xDesiredTickCount,
  yDesiredTickCount = 4,
  presentation,
  legendEnabled = false,
  tooltip: TooltipComponent,
  tooltipXUnitFormat,
  tooltipYUnitFormat,
  id,
  onBarClick,
  onBarHover,
}) {
  const [hoverState, setHoverState] = useState(null);
  const [hoveredX, setHoveredX] = useState(null);
  const tooltipElRef = useRef(null);
  const tooltipContainerRef = useRef(null);

  const { xScale, yScale } = useMemo(
    () => buildBarScales(data, x, y, { stack, group, yScaleFormat }),
    [data, x, y, stack, group, yScaleFormat]
  );

  const metadata = useMemo(
    () => buildMetadata(data, { stack, group, presentation }),
    [data, stack, group, presentation]
  );

  const legendData = useMemo(
    () => legendEnabled ? buildLegendData(metadata, { stack, group }) : [],
    [metadata, stack, group, legendEnabled]
  );

  const bars = useMemo(() => {
    if (!data || data.length === 0) return [];
    const result = [];
    const bandwidth = xScale.bandwidth();
    const barWidth = bandwidth * 0.75;
    const xCategories = xScale.ticks();

    if (stack) {
      for (const xVal of xCategories) {
        const xPos = xScale.plot(xVal) - barWidth / 2;
        const barsAtX = data.filter(d => {
          if (d[x] instanceof Date && xVal instanceof Date) return d[x].getTime() === xVal.getTime();
          return String(d[x]) === String(xVal);
        });

        let posY = 0, negY = 0;
        for (const d of barsAtX) {
          const val = d[y] ?? 0;
          const stackVal = d[stack];
          const entry = metadata.stacks.get(stackVal) || metadata.global;
          const color = entry.color || 'var(--color-chart-1)';
          const isForecast = forecast && d[forecast] != null;

          if (val >= 0) {
            const y0 = yScale.plot(posY);
            const y1 = yScale.plot(posY + val);
            result.push({ x: xPos, y0, y1, width: barWidth, color, isForecast, xVal, stackVal });
            posY += val;
          } else {
            const y0 = yScale.plot(negY + val);
            const y1 = yScale.plot(negY);
            result.push({ x: xPos, y0, y1, width: barWidth, color, isForecast, xVal, stackVal });
            negY += val;
          }
        }
      }
    } else if (group) {
      const groupValues = [...new Set(data.map(d => d[group]).filter(v => v != null))];
      const groupCount = groupValues.length;
      const groupWidth = barWidth / groupCount;

      for (const xVal of xCategories) {
        const xPos = xScale.plot(xVal) - barWidth / 2;
        for (let gi = 0; gi < groupValues.length; gi++) {
          const gVal = groupValues[gi];
          const d = data.find(item => {
            const xMatch = item[x] instanceof Date && xVal instanceof Date
              ? item[x].getTime() === xVal.getTime()
              : String(item[x]) === String(xVal);
            return xMatch && item[group] === gVal;
          });
          if (!d) continue;
          const val = d[y] ?? 0;
          const entry = metadata.groups.get(gVal) || metadata.global;
          const color = entry.color || 'var(--color-chart-1)';
          const isForecast = forecast && d[forecast] != null;
          const y0 = yScale.plot(Math.min(0, val));
          const y1 = yScale.plot(Math.max(0, val));
          result.push({ x: xPos + gi * groupWidth, y0, y1, width: groupWidth * 0.9, color, isForecast, xVal, groupVal: gVal });
        }
      }
    } else {
      for (const xVal of xCategories) {
        const xPos = xScale.plot(xVal) - barWidth / 2;
        const d = data.find(item => {
          if (item[x] instanceof Date && xVal instanceof Date) return item[x].getTime() === xVal.getTime();
          return String(item[x]) === String(xVal);
        });
        if (!d) continue;
        const val = d[y] ?? 0;
        const color = metadata.global.color || 'var(--color-chart-1)';
        const isForecast = forecast && d[forecast] != null;
        const y0 = yScale.plot(Math.min(0, val));
        const y1 = yScale.plot(Math.max(0, val));
        result.push({ x: xPos, y0, y1, width: barWidth, color, isForecast, xVal });
      }
    }

    return result;
  }, [data, x, y, stack, group, forecast, xScale, yScale, metadata]);

  const handlePointerMove = useCallback((e) => {
    if (TooltipComponent === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const svgX = relX * 100;
    const xVal = xScale.invert(svgX);
    if (xVal == null) { setHoverState(null); setHoveredX(null); return; }

    const nearData = data.filter(d => {
      if (d[x] instanceof Date && xVal instanceof Date) return d[x].getTime() === xVal.getTime();
      return String(d[x]) === String(xVal);
    });

    if (nearData.length === 0) { setHoverState(null); setHoveredX(null); return; }

    const items = [];
    for (const d of nearData) {
      const key = stack ? d[stack] : group ? d[group] : '__default__';
      const entry = stack ? metadata.stacks.get(key) : group ? metadata.groups.get(key) : metadata.global;
      items.push({
        color: entry?.color || 'var(--color-chart-1)',
        name: entry?.name || (key === '__default__' ? 'Value' : String(key)),
        value: d[y],
      });
    }

    // Sail: tooltipRightX = xScale.plot(xValue) + xScale.step() / 2
    // Sail: tooltipLeftX = 100 - (xScale.plot(xValue) - xScale.step() / 2)
    const plotX = xScale.plot(xVal);
    const step = xScale.step();
    const tooltipRightX = plotX + step / 2;
    const tooltipLeftX = 100 - (plotX - step / 2);

    setHoveredX(String(xVal));
    setHoverState({
      x: xVal,
      items,
      tooltipRightX,
      tooltipLeftX,
      pixelY: e.clientY - rect.top + 3,
    });

    if (onBarHover) {
      const hoveredPoint = nearData[0] || null;
      onBarHover({ chartId: id, eventType: 'bar.segment.hover', data: hoveredPoint, nativeEvent: e, meta: { x, y, stack, group } });
    }
  }, [data, x, y, stack, group, xScale, metadata, TooltipComponent, id, onBarHover]);

  const handlePointerLeave = useCallback(() => {
    setHoverState(null);
    setHoveredX(null);
    if (onBarHover) {
      onBarHover({ chartId: id, eventType: 'bar.segment.hover', data: null, nativeEvent: null, meta: { x, y, stack, group } });
    }
  }, [id, x, y, stack, group, onBarHover]);

  if (!data || data.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-subdued text-body-small">No data</div>;
  }

  const fmtValue = (v, fmt) => formatValue(v, fmt);
  const hasForecast = forecast && data.some(d => d[forecast] != null);
  const Tip = TooltipComponent === null ? null : (TooltipComponent || DefaultTooltip);
  const resolvedXTickCount = xDesiredTickCount ?? Math.min(xScale.ticks().length, 8);

  const tooltipContent = hoverState && Tip ? (
    <div
      ref={tooltipContainerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10, overflow: 'visible' }}
    >
      <div
        ref={tooltipElRef}
        className="absolute"
        style={(() => {
          const tooltipW = tooltipElRef.current?.offsetWidth ?? 0;
          const containerW = tooltipContainerRef.current?.offsetWidth ?? 1;
          const tooltipWidthPct = (tooltipW / containerW) * 100;
          const fitsRight = tooltipWidthPct < (100 - hoverState.tooltipRightX);
          return {
            ...(fitsRight
              ? { left: `${hoverState.tooltipRightX}%` }
              : { right: `${hoverState.tooltipLeftX}%` }),
            top: `${hoverState.pixelY}px`,
          };
        })()}
      >
        <Tip
          x={hoverState.x}
          items={hoverState.items}
          xFormat={(v) => fmtValue(v, tooltipXUnitFormat || xUnitFormat)}
          yFormat={(v) => fmtValue(v, tooltipYUnitFormat || yUnitFormat)}
        />
      </div>
    </div>
  ) : null;

  return (
    <ChartContainer
      xScale={xScale}
      yScale={yScale}
      xUnitFormat={xUnitFormat}
      yUnitFormat={yUnitFormat}
      xDesiredTickCount={resolvedXTickCount}
      yDesiredTickCount={yDesiredTickCount}
      legendData={legendData}
      legendEnabled={legendEnabled}
      Legend={Legend}
      formatValue={fmtValue}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      tooltipContent={tooltipContent}
    >
      {/* Zero baseline */}
      {yScale.domain()[0] < 0 && (
        <line
          x1="0" y1={100 - yScale.plot(0)}
          x2="100" y2={100 - yScale.plot(0)}
          stroke="var(--color-neutral-400)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Bars */}
      {bars.map((bar, i) => {
        const isHovered = hoveredX != null && String(bar.xVal) === hoveredX;
        const isDimmed = hoveredX != null && !isHovered;
        const barHeight = Math.max(0, bar.y1 - bar.y0);
        const gap = stack ? 0.4 : 0;

        return (
          <React.Fragment key={i}>
            <rect
              x={bar.x}
              y={100 - bar.y1 + gap}
              width={bar.width}
              height={Math.max(0, barHeight - gap)}
              fill={bar.isForecast ? forecastColor(bar.color) : bar.color}
              opacity={isDimmed ? 0.35 : 1}
              rx="0.3"
              ry="0.3"
              style={{ transition: 'opacity 0.15s', cursor: onBarClick ? 'pointer' : undefined }}
              onClick={onBarClick ? (e) => {
                const d = data.find(item => {
                  const xMatch = item[x] instanceof Date && bar.xVal instanceof Date
                    ? item[x].getTime() === bar.xVal.getTime()
                    : String(item[x]) === String(bar.xVal);
                  if (!xMatch) return false;
                  if (stack && bar.stackVal != null) return item[stack] === bar.stackVal;
                  if (group && bar.groupVal != null) return item[group] === bar.groupVal;
                  return true;
                });
                onBarClick({ chartId: id, eventType: 'bar.segment.click', data: d || null, nativeEvent: e, meta: { x, y, stack, group } });
              } : undefined}
            />
            {bar.isForecast && barHeight > 0 && (
              <line
                x1={bar.x}
                y1={100 - bar.y1 + gap}
                x2={bar.x + bar.width}
                y2={100 - bar.y1 + gap}
                stroke={bar.color}
                strokeWidth="2"
                strokeDasharray="4 2"
                strokeLinecap="butt"
                vectorEffect="non-scaling-stroke"
                opacity={isDimmed ? 0.35 : 1}
              />
            )}
          </React.Fragment>
        );
      })}
    </ChartContainer>
  );
}
