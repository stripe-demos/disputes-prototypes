import React from 'react';

export default function Tooltip({ x, items, xFormat, yFormat }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-lg shadow-lg py-1.5 px-2.5 min-w-[120px] max-w-[220px]">
      <div className="text-label-small-emphasized text-default pb-1 mb-1 border-b border-border truncate">
        {xFormat ? xFormat(x) : String(x instanceof Date ? x.toLocaleDateString() : x)}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <span
                className="inline-block w-1.5 h-1.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-label-small text-subdued truncate">{item.name}</span>
            </div>
            <span className="text-label-small-emphasized text-default flex-shrink-0">
              {yFormat ? yFormat(item.value) : (typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
