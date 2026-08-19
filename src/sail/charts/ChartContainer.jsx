import React, { useRef, useState, useLayoutEffect } from 'react';

export default function ChartContainer({
  children,
  xScale,
  yScale,
  xUnitFormat,
  yUnitFormat,
  xDesiredTickCount = 5,
  yDesiredTickCount = 4,
  legendData,
  legendEnabled,
  showXAxis = true,
  showYAxis = true,
  onPointerMove,
  onPointerLeave,
  Legend,
  formatValue,
  tooltipContent,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const xTicks = xScale?.ticks?.(xDesiredTickCount) ?? [];
  const yTicks = yScale?.ticks?.(yDesiredTickCount) ?? [];

  return (
    <div className="flex flex-col gap-1.5 w-full h-full min-h-0">
      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 w-full"
      >
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateAreas: `"chart y-axis" "x-axis ."`,
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, auto)',
            gridTemplateRows: 'minmax(0, 1fr) minmax(0, auto)',
            gap: '4px',
          }}
        >
          {/* Chart plot area — tooltip is placed here so its % values match SVG width */}
          <div
            className="relative w-full h-full"
            style={{ gridArea: 'chart', overflow: 'visible' }}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <svg
              viewBox="0 0 100 100"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              style={{ overflow: 'visible', display: 'block' }}
            >
              {/* Grid lines */}
              {showYAxis && yTicks.map((tick, i) => {
                const y = 100 - yScale.plot(tick);
                return (
                  <line
                    key={`y-grid-${i}`}
                    x1="0" y1={y} x2="100" y2={y}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.5"
                  />
                );
              })}
              {children}
            </svg>

            {/* Tooltip layer — inside chart plot area so % matches SVG coordinate space */}
            {tooltipContent}
          </div>

          {/* Y-axis */}
          {showYAxis && (
            <div
              className="flex flex-col justify-between items-start pl-1.5"
              style={{ gridArea: 'y-axis' }}
            >
              {[...yTicks].reverse().map((tick, i) => (
                <span key={`y-${i}`} className="text-label-small text-subdued whitespace-nowrap">
                  {formatValue(tick, yUnitFormat)}
                </span>
              ))}
            </div>
          )}

          {/* X-axis — each tick positioned at xScale.plot(tick)% to align with bars/lines */}
          {showXAxis && (
            <div
              className="relative pt-1"
              style={{ gridArea: 'x-axis', minHeight: '1.25rem' }}
            >
              {xTicks.map((tick, i) => (
                <span
                  key={`x-${i}`}
                  className="absolute text-label-small text-subdued whitespace-nowrap"
                  style={{
                    left: `${xScale.plot(tick)}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {formatValue(tick, xUnitFormat)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {legendEnabled && legendData && legendData.length > 0 && Legend && (
        <Legend items={legendData} />
      )}
    </div>
  );
}
