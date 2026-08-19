import React from 'react';

// Reusable label component for form fields
export const FormField = ({
  label,
  description,
  error,
  errorMessage,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <div>
        {label && (
          <label className="block text-label-medium-emphasized text-default">
            {label}
          </label>
        )}
        {description && (
          <p className="text-label-small text-subdued">{description}</p>
        )}
      </div>
      {children}
      {error && errorMessage && (
        <p className="text-label-small text-critical">{errorMessage}</p>
      )}
    </div>
  );
};

// Inline SVG data URL for select chevron
const selectChevronUrl = "data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M1.92637 7.24258C2.23422 6.92566 2.7407 6.91831 3.05762 7.22617L6.00023 10.0846L8.94277 7.22622C9.25969 6.91836 9.76617 6.92571 10.074 7.24263C10.3819 7.55954 10.3745 8.06602 10.0576 8.37388L6.55765 11.7738C6.40243 11.9246 6.20133 12 6.00023 12C5.79912 12 5.59802 11.9246 5.4428 11.7738L1.94277 8.37383C1.62586 8.06597 1.61851 7.5595 1.92637 7.24258Z' fill='%236B7280'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M5.4428 0.22617C5.59802 0.0753911 5.79912 0 6.00022 0C6.20133 0 6.40243 0.0753906 6.55765 0.226175L10.0576 3.62613C10.3745 3.93398 10.3819 4.44046 10.074 4.75738C9.76616 5.07429 9.25968 5.08163 8.94277 4.77378L6.00022 1.91532L3.05762 4.77378C2.7407 5.08164 2.23422 5.07429 1.92637 4.75737C1.61851 4.44046 1.62586 3.93398 1.94277 3.62612L5.4428 0.22617Z' fill='%236B7280'/%3E%3C/svg%3E";

// Format number with commas (e.g., 10000 → 10,000)
const formatWithCommasHelper = (value) => {
  if (!value && value !== 0) return '';
  const stringValue = String(value);
  // Split by decimal point
  const parts = stringValue.split('.');
  // Add commas to integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

// Remove commas from string (e.g., "10,000" → "10000")
const stripCommas = (value) => {
  if (!value) return '';
  return String(value).replace(/,/g, '');
};

const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  size = 'md',
  className = '',
  icon: Icon,
  prefix,
  suffix,
  disabled = false,
  error = false,
  errorMessage = '',
  formatWithCommas = false,
  label,
  description,
  ...props
}) => {
  const sizes = {
    sm: 'h-[24px] py-[4px] px-[8px] text-[12px] leading-[16px]',
    md: 'h-[28px] py-[4px] px-[8px] text-[14px] leading-[20px]',
    lg: 'h-[40px] py-[8px] px-[12px] text-[16px] leading-[24px]',
  };

  // Determine padding based on icon, prefix, or suffix
  const leftPadding = Icon ? 'pl-9' : prefix ? 'pl-7' : '';
  const rightPadding = suffix ? 'pr-12' : '';

  // Handle comma-formatted input
  const handleChange = (e) => {
    if (formatWithCommas) {
      const rawValue = stripCommas(e.target.value);
      // Only allow numbers and decimal point
      if (rawValue === '' || /^-?\d*\.?\d*$/.test(rawValue)) {
        // Create synthetic event with raw value
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: rawValue
          }
        };
        onChange(syntheticEvent);
      }
    } else {
      onChange(e);
    }
  };

  // Format displayed value with commas if enabled
  const displayValue = formatWithCommas ? formatWithCommasHelper(value) : value;

  const inputElement = (
    <div>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-subdued">
            <Icon size={16} />
          </div>
        )}
        {prefix && !Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body-small text-subdued">
            {prefix}
          </span>
        )}
        <input
          type={formatWithCommas ? 'text' : type}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full appearance-none rounded-[6px] bg-surface shadow-[0_0_0_1px_var(--color-border)] transition-shadow duration-[240ms] focus:outline-none focus:shadow-[0_0_0_1px_var(--color-border),0_0_0_4px_rgba(8,142,249,0.36)] text-default placeholder:text-placeholder disabled:opacity-60 disabled:bg-gray-100 ${sizes[size]} ${leftPadding} ${rightPadding} ${error ? 'shadow-[0_0_0_1px_var(--color-critical)]' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-body-small text-subdued">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  if (label || description) {
    return (
      <FormField label={label} description={description} error={error} errorMessage={errorMessage}>
        {inputElement}
      </FormField>
    );
  }

  return (
    <>
      {inputElement}
      {error && errorMessage && (
        <p className="mt-1.5 text-label-small text-critical">{errorMessage}</p>
      )}
    </>
  );
};

export const Textarea = ({
  value,
  onChange,
  placeholder,
  rows = 2,
  className = '',
  label,
  description,
  error = false,
  errorMessage = '',
  ...props
}) => {
  const textareaElement = (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`w-full appearance-none px-[8px] py-[4px] text-[14px] leading-[20px] rounded-[6px] bg-surface text-default placeholder:text-placeholder shadow-[0_0_0_1px_var(--color-border)] transition-shadow duration-[240ms] focus:outline-none focus:shadow-[0_0_0_1px_var(--color-border),0_0_0_4px_rgba(8,142,249,0.36)] resize-none ${error ? 'shadow-[0_0_0_1px_var(--color-critical)]' : ''} ${className}`}
      {...props}
    />
  );

  if (label || description) {
    return (
      <FormField label={label} description={description} error={error} errorMessage={errorMessage}>
        {textareaElement}
      </FormField>
    );
  }

  return (
    <>
      {textareaElement}
      {error && errorMessage && (
        <p className="mt-1.5 text-label-small text-critical">{errorMessage}</p>
      )}
    </>
  );
};

export const Select = ({
  value,
  onChange,
  children,
  size = 'md',
  className = '',
  label,
  description,
  error = false,
  errorMessage = '',
  ...props
}) => {
  const sizes = {
    sm: 'h-[24px] py-[4px] pl-[8px] pr-[28px] text-[12px] leading-[16px]',
    md: 'h-[28px] py-[4px] pl-[8px] pr-[28px] text-[14px] leading-[20px]',
    lg: 'h-[40px] py-[8px] pl-[12px] pr-[32px] text-[16px] leading-[24px]',
  };

  const chevronPositions = {
    sm: 'right 0.375rem center',
    md: 'right 0.5rem center',
    lg: 'right 0.625rem center',
  };

  const selectElement = (
    <select
      value={value}
      onChange={onChange}
      className={`appearance-none rounded-[6px] bg-surface shadow-[0_0_0_1px_var(--color-border)] transition-shadow duration-[240ms] focus:outline-none focus:shadow-[0_0_0_1px_var(--color-border),0_0_0_4px_rgba(8,142,249,0.36)] bg-no-repeat text-default placeholder:text-placeholder disabled:opacity-50 disabled:bg-gray-100 ${sizes[size]} ${error ? 'shadow-[0_0_0_1px_var(--color-critical)]' : ''} ${className}`}
      style={{
        backgroundImage: `url("${selectChevronUrl}")`,
        backgroundPosition: chevronPositions[size],
        backgroundSize: '12px',
      }}
      {...props}
    >
      {children}
    </select>
  );

  if (label || description) {
    return (
      <FormField label={label} description={description} error={error} errorMessage={errorMessage}>
        {selectElement}
      </FormField>
    );
  }

  return (
    <>
      {selectElement}
      {error && errorMessage && (
        <p className="mt-1.5 text-label-small text-critical">{errorMessage}</p>
      )}
    </>
  );
};

export const Checkbox = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <label className={`inline-flex items-start gap-2 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
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
          className={`w-[14px] h-[14px] mt-0.5 border rounded-sm transition-colors flex items-center justify-center peer-focus:ring-[rgba(8,142,249,0.36)] peer-focus:ring-4 ${checked
            ? 'bg-brand-500 border-brand-500'
            : 'bg-surface border-border group-hover:border-gray-400'
            }`}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={checked ? 'opacity-100' : 'opacity-0'}>
            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
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

export const Radio = ({
  checked,
  onChange,
  name,
  value,
  label,
  description,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <label className={`inline-flex items-start gap-2 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex-shrink-0">
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          name={name}
          value={value}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          className={`w-[14px] h-[14px] mt-0.5 border rounded-full transition-all flex items-center justify-center peer-focus:ring-[rgba(8,142,249,0.36)] peer-focus:ring-4 ${checked
            ? 'bg-brand-500 border-brand-500'
            : 'bg-surface border-border group-hover:border-gray-400'
            }`}
        >
          {checked && (
            <div className="w-[6px] h-[6px] rounded-full bg-white" />
          )}
        </div>
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

export default Input;
