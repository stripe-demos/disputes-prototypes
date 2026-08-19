import React from 'react';

export default function Legend({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          {item.shape === 'line' ? (
            <span className="inline-block w-3 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
          ) : (
            <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
          )}
          <span className="text-label-small text-subdued">{item.name}</span>
        </div>
      ))}
    </div>
  );
}
