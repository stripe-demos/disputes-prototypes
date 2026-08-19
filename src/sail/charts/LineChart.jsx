import React, { useMemo, useState, useCallback, useRef } from 'react';
import PathGenerator from './paths';
import ChartContainer from './ChartContainer';
import DefaultTooltip from './Tooltip';
import Legend from './Legend';
import { buildLineScales, groupBy, buildMetadata, formatValue, buildLegendData } from './utils';

const LINE_STYLES = {
  default: {},
  dashed: { strokeDasharray: '4 4' },
  'long-dashed': { strokeDasharray: '8 6' },
};

export default function LineChart({
  data,
  x,
  y,
  facet,
  lineSegment,
  confidenceInterval,
  xUnitFormat,
  yUnitFormat,
  xScaleFormat,
  yScaleFormat,
  xDesiredTickCount = 5,
  yDesiredTickCount = 4,
  presentation,
  legendEnabled = false,
  tooltip: TooltipComponent,
  tooltipXUnitFormat,
  tooltipYUnitFormat,
  id,
  onLineClick,
  onLineHover,
  onPointerMove: onPointerMoveCallback,
  onNeedleHover,
}) {
  const [hoverState, setHoverState] = useState(null);
  const tooltipElRef = useRef(null);
  const tooltipContainerRef = useRef(null);

  const { xScale, yScale } = useMemo(
    () => buildLineScales(data, x, y, { yScaleFormat, xScaleFormat }),
    [data, x, y, yScaleFormat, xScaleFormat]
  );

  const metadata = useMemo(
    () => buildMetadata(data, { facet, presentation }),
    [data, facet, presentation]
  );

  const legendData = useMemo(
    () => legendEnabled ? buildLegendData(metadata, { facet }) : [],
    [metadata, facet, legendEnabled]
  );

  const lines = useMemo(() => {
    if (!data || data.length === 0) return [];
    const result = [];

    if (facet) {
      const groups = groupBy(data, facet);
      for (const [facetValue, facetData] of groups) {
        const entry = metadata.facets.get(facetValue) || {};
        const color = entry.color || metadata.global.color || 'var(--color-chart-1)';
        const lineStyle = entry.lineStyle || metadata.global.lineStyle || 'default';

        if (lineSegment) {
          const segments = groupBy(facetData, lineSegment);
          for (const [segValue, segData] of segments) {
            const segMeta = metadata.lineSegments?.get(segValue);
            const segStyle = segMeta?.lineStyle || lineStyle;
            result.push({ data: segData, color, lineStyle: segStyle, facetValue, segValue });
          }
        } else {
          result.push({ data: facetData, color, lineStyle, facetValue });
        }
      }
    } else if (lineSegment) {
      const color = metadata.global.color || 'var(--color-chart-1)';
      const segments = groupBy(data, lineSegment);
      for (const [segValue, segData] of segments) {
        const segMeta = metadata.lineSegments?.get(segValue);
        const segStyle = segMeta?.lineStyle || metadata.global.lineStyle || 'default';
        result.push({ data: segData, color, lineStyle: segStyle, segValue });
      }
    } else {
      const color = metadata.global.color || 'var(--color-chart-1)';
      result.push({ data, color, lineStyle: metadata.global.lineStyle || 'default' });
    }

    return result;
  }, [data, x, y, facet, lineSegment, metadata]);

  const ciAreas = useMemo(() => {
    if (!confidenceInterval || !data || data.length === 0) return [];
    const { lower, upper } = confidenceInterval;
    const result = [];

    const processGroup = (groupData, color) => {
      const upperCoords = [];
      const lowerCoords = [];
      for (const d of groupData) {
        const px = xScale.plot(d[x]);
        const upperVal = d[upper];
        const lowerVal = d[lower];
        if (upperVal != null && lowerVal != null) {
          upperCoords.push(px, yScale.plot(upperVal));
          lowerCoords.push(px, yScale.plot(lowerVal));
        }
      }
      if (upperCoords.length >= 4) {
        const gen = new PathGenerator();
        gen.area(upperCoords, lowerCoords);
        result.push({ d: gen.toPath(), color });
      }
    };

    if (facet) {
      const groups = groupBy(data, facet);
      for (const [facetValue, facetData] of groups) {
        const entry = metadata.facets.get(facetValue) || {};
        const color = entry.color || metadata.global.color || 'var(--color-chart-1)';
        processGroup(facetData, color);
      }
    } else {
      const color = metadata.global.color || 'var(--color-chart-1)';
      processGroup(data, color);
    }

    return result;
  }, [data, x, confidenceInterval, facet, xScale, yScale, metadata]);

  // Find the closest x-value data point to a given SVG x coordinate
  const findClosestX = useCallback((svgX) => {
    let closest = null;
    let minDist = Infinity;
    for (const d of data) {
      const dist = Math.abs(xScale.plot(d[x]) - svgX);
      if (dist < minDist) { minDist = dist; closest = d; }
    }
    if (!closest || minDist > 15) return null;
    return closest[x];
  }, [data, x, xScale]);

  const handlePointerMove = useCallback((e) => {
    if (TooltipComponent === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const svgX = relX * 100;

    const closestX = findClosestX(svgX);
    if (closestX == null) { setHoverState(null); return; }

    // Get all data points at this x value
    const nearData = data.filter(d => {
      if (d[x] instanceof Date && closestX instanceof Date) return d[x].getTime() === closestX.getTime();
      return d[x] === closestX;
    });

    const items = [];
    const points = [];

    for (const d of nearData) {
      const facetValue = facet ? d[facet] : '__default__';
      const entry = facet ? metadata.facets.get(facetValue) : metadata.global;
      const color = entry?.color || 'var(--color-chart-1)';
      const name = entry?.name || (facet ? String(facetValue) : 'Value');

      items.push({ color, name, value: d[y] });

      if (d[y] != null) {
        points.push({ color, svgY: yScale.plot(d[y]) });
      }
    }

    // The x position in SVG space (0-100), same for needle + dots
    const svgXPos = xScale.plot(closestX);

    const newHoverState = {
      x: closestX,
      items,
      points,
      svgXPos,
      pixelY: e.clientY - rect.top + 3,
    };
    setHoverState(newHoverState);

    if (onPointerMoveCallback) {
      onPointerMoveCallback({ chartId: id, eventType: 'line.pointer.move', data: closestX, nativeEvent: e, meta: { x, y, facet } });
    }
    if (onNeedleHover) {
      const needleData = nearData;
      onNeedleHover({ chartId: id, eventType: 'line.needle.hover', data: needleData, nativeEvent: e, meta: { x, y, facet } });
    }
  }, [data, x, y, facet, xScale, yScale, metadata, TooltipComponent, findClosestX, id, onPointerMoveCallback, onNeedleHover]);

  const handlePointerLeave = useCallback(() => {
    setHoverState(null);
    if (onPointerMoveCallback) {
      onPointerMoveCallback({ chartId: id, eventType: 'line.pointer.move', data: null, nativeEvent: null, meta: { x, y, facet } });
    }
    if (onNeedleHover) {
      onNeedleHover({ chartId: id, eventType: 'line.needle.hover', data: null, nativeEvent: null, meta: { x, y, facet } });
    }
    if (onLineHover) {
      onLineHover({ chartId: id, eventType: 'line.series.hover', data: null, nativeEvent: null, meta: { x, y, facet } });
    }
  }, [id, x, y, facet, onPointerMoveCallback, onNeedleHover, onLineHover]);

  if (!data || data.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-subdued text-body-small">No data</div>;
  }

  const fmtValue = (v, fmt) => formatValue(v, fmt);
  const Tip = TooltipComponent === null ? null : (TooltipComponent || DefaultTooltip);

  // Sail structure: tooltip container matches chart plot area width,
  // so left/right percentages map 1:1 to SVG coordinate space (0-100)
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
          const nearPointX = hoverState.svgXPos;
          const tooltipW = tooltipElRef.current?.offsetWidth ?? 0;
          const containerW = tooltipContainerRef.current?.offsetWidth ?? 1;
          const tooltipWidthPct = (tooltipW / containerW) * 100;
          const fitsRight = tooltipWidthPct < (100 - nearPointX - 3);
          const xRight = nearPointX + 3;
          const xLeft = nearPointX - 3;
          return {
            ...(fitsRight
              ? { left: `${xRight}%` }
              : { right: `${100 - xLeft}%` }),
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
      xDesiredTickCount={xDesiredTickCount}
      yDesiredTickCount={yDesiredTickCount}
      legendData={legendData}
      legendEnabled={legendEnabled}
      Legend={Legend}
      formatValue={fmtValue}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      tooltipContent={tooltipContent}
    >
      {/* Confidence interval areas */}
      {ciAreas.map((area, i) => (
        <path
          key={`ci-${i}`}
          d={area.d}
          fill={area.color}
          fillOpacity={0.15}
          stroke="none"
        />
      ))}

      {/* Lines */}
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
            key={`line-${i}`}
            d={pathD}
            fill="none"
            stroke={line.color}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ cursor: onLineClick ? 'pointer' : undefined }}
            onClick={onLineClick ? (e) => {
              onLineClick({ chartId: id, eventType: 'line.series.click', data: line.data, nativeEvent: e, meta: { x, y, facet } });
            } : undefined}
            onMouseEnter={onLineHover ? (e) => {
              onLineHover({ chartId: id, eventType: 'line.series.hover', data: line.data, nativeEvent: e, meta: { x, y, facet } });
            } : undefined}
            {...LINE_STYLES[line.lineStyle] || {}}
          />
        );
      })}

      {/* Needle + data point circles (all in SVG space, matching Sail) */}
      {hoverState && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Vertical needle line */}
          <line
            x1={hoverState.svgXPos}
            y1="0"
            x2={hoverState.svgXPos}
            y2="100"
            stroke="var(--color-neutral-400)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="2 2"
          />
          {/* Data points — outer ring (surface color) + inner circle (series color) */}
          {hoverState.points.map((pt, i) => (
            <g key={`pt-${i}`}>
              <path
                d={`M ${hoverState.svgXPos} ${100 - pt.svgY} h 0.0001`}
                stroke="var(--color-surface)"
                strokeWidth="11"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                fill="none"
              />
              <path
                d={`M ${hoverState.svgXPos} ${100 - pt.svgY} h 0.0001`}
                stroke={pt.color}
                strokeWidth="8"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                fill="none"
              />
            </g>
          ))}
        </g>
      )}
    </ChartContainer>
  );
}
