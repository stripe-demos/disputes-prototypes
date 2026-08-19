import React from 'react';

/**
 * A reusable toggle component for selecting options.
 * Used in card type selection, payment method selection, etc.
 */
const Toggle = ({
  icon: Icon,
  image,
  title,
  description,
  selected = false,
  onClick,
  inline = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${inline ? '' : 'w-full h-full'} text-left rounded-lg transition-colors cursor-pointer flex flex-col items-stretch ${selected
        ? 'border-2 border-brand-500 p-[11px]'
        : 'border border-border hover:bg-offset p-[12px]'
        }`}
    >
      {image && (
        <div className="mb-2.5 rounded-md overflow-hidden border border-border">
          {image}
        </div>
      )}
      <div className="flex items-start gap-2.5">
        {Icon && (
          <div className={`mt-0.5 flex-shrink-0 ${selected ? 'text-brand-500' : 'text-icon-subdued'}`}>
            <Icon size={16} />
          </div>
        )}
        <div className="flex-1">
          <div className={`text-label-medium-emphasized ${selected ? 'text-brand-500' : 'text-default'}`}>
            {title}
          </div>
          {description && (
            <div className="text-body-small text-subdued">{description}</div>
          )}
        </div>
      </div>
    </button>
  );
};

/**
 * A group wrapper for multiple toggles
 * @param {string} layout - 'vertical' (default) or 'horizontal'
 */
export const ToggleGroup = ({ children, label, layout = 'vertical' }) => {
  const layoutClass = layout === 'horizontal'
    ? 'flex gap-2'
    : 'space-y-2';

  return (
    <div>
      {label && (
        <label className="block text-label-medium mb-2 text-default">
          {label}
        </label>
      )}
      <div className={layoutClass}>{children}</div>
    </div>
  );
};

export default Toggle;
