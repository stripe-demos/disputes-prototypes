import React from 'react';

export const Switch = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <label className={`inline-flex items-start gap-3 cursor-pointer group duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          className={`w-[34px] h-[20px] border rounded-full transition-all ${checked ? 'bg-brand-500 border-brand-500' : 'bg-offset border-border group-hover:border-gray-400'
            }`}
        />
        <div
          className={`absolute top-0 left-0 w-[20px] h-[20px] border bg-surface rounded-full transition-all ${checked ? 'translate-x-[14px] border-brand-500' : 'border-border group-hover:border-gray-400'
            }`}
        />
      </div>
      {(label || description) && (
        <div className="space-y-0.5">
          {label && (
            <span className="block text-label-medium-emphasized text-default">{label}</span>
          )}
          {description && (
            <span className="block text-label-small text-subdued">{description}</span>
          )}
        </div>
      )}
    </label>
  );
};

export default Switch;
