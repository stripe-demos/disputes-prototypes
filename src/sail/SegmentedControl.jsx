import React from 'react';

/**
 * A segmented control for selecting one of a small set of mutually exclusive options.
 */
const SegmentedControl = ({ options, value, onChange, className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-0.5 bg-offset rounded-[8px] p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`text-label-medium-emphasized rounded-[6px] px-4 py-1.5 transition-all duration-200 ease-out ${active
              ? 'bg-surface text-default shadow-[0px_1px_2px_0px_rgba(10,33,86,0.16)]'
              : 'text-subdued hover:bg-neutral-100 hover:text-default'
              }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
