import React, { useMemo, useState, useCallback } from 'react';
import { ColorManager } from './colors';
import { formatValue } from './utils';

export default function MeterChart({
  data,
  segmentName,
  segmentValue,
  unitFormat,
  legendEnabled = false,
  presentation,
  id,
  onSegmentClick,
  onSegmentHover,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const normalizedData = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }, [data]);

  const { segments, total } = useMemo(() => {
    const colorMgr = new ColorManager();
    const total = normalizedData.reduce((sum, d) => sum + (d[segmentValue] || 0), 0);

    const presentationMap = new Map();
    if (Array.isArray(presentation)) {
      for (const rule of presentation) {
        if (rule.attribute === 'segment' || rule.attribute === 'segmentName') {
          presentationMap.set(rule.value, rule);
        }
      }
    }

    const segs = normalizedData.map((d, i) => {
      const name = d[segmentName];
      const value = d[segmentValue] || 0;
      const pct = total > 0 ? value / total : 0;
      const rule = presentationMap.get(name);
      const color = rule?.color || colorMgr.get(name);
      const displayName = rule?.name || String(name);
      return { name: displayName, value, pct, color, originalName: name };
    });

    return { segments: segs, total };
  }, [normalizedData, segmentName, segmentValue, presentation]);

  if (normalizedData.length === 0) {
    return <div className="w-full flex items-center justify-center text-subdued text-body-small">No data</div>;
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Meter bar */}
      <div className="w-full h-3 flex gap-[2px]">
        {segments.map((seg, i) => {
          const width = `${seg.pct * 100}%`;
          const isFirst = i === 0;
          const isLast = i === segments.length - 1;
          return (
            <div
              key={i}
              className="h-full transition-opacity"
              style={{
                width,
                backgroundColor: seg.color,
                opacity: hoveredIdx != null && hoveredIdx !== i ? 0.4 : 1,
                borderRadius: isFirst && isLast ? '4px' : isFirst ? '4px 0 0 4px' : isLast ? '0 4px 4px 0' : '0',
                cursor: onSegmentClick ? 'pointer' : undefined,
              }}
              onMouseEnter={(e) => {
                setHoveredIdx(i);
                if (onSegmentHover) onSegmentHover({ chartId: id, eventType: 'meter.segment.hover', data: normalizedData[i], nativeEvent: e, meta: { segmentName, segmentValue } });
              }}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={onSegmentClick ? (e) => {
                onSegmentClick({ chartId: id, eventType: 'meter.segment.click', data: normalizedData[i], nativeEvent: e, meta: { segmentName, segmentValue } });
              } : undefined}
            />
          );
        })}
      </div>

      {/* Legend */}
      {legendEnabled && (
        <div className="flex flex-col">
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`flex items-center justify-between gap-2 py-2.5 px-2 transition-colors cursor-default ${i > 0 ? 'border-t border-border' : ''}`}
              style={{
                backgroundColor: hoveredIdx === i ? 'var(--color-offset)' : 'transparent',
                opacity: hoveredIdx != null && hoveredIdx !== i ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                setHoveredIdx(i);
                if (onSegmentHover) onSegmentHover({ chartId: id, eventType: 'meter.legend.hover', data: normalizedData[i], nativeEvent: e, meta: { segmentName, segmentValue } });
              }}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={onSegmentClick ? (e) => {
                onSegmentClick({ chartId: id, eventType: 'meter.legend.click', data: normalizedData[i], nativeEvent: e, meta: { segmentName, segmentValue } });
              } : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-label-small text-default">{seg.name}</span>
              </div>
              <span className="text-label-small-emphasized text-default">
                {formatValue(seg.value, unitFormat)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
