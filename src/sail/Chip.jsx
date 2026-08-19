import { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons/SailIcons';
import SelectDropdown from './SelectDropdown';

/**
 * Chip — a filter pill that toggles a dropdown panel.
 *
 * Unselected state: addCircle icon + label only
 * Selected state: closeCircle icon (clears selection) + label + divider + displayValue + chevron
 *
 * @param {string}   label          - Category label (always shown)
 * @param {*}        value          - Current value — falsy or empty array = unselected
 * @param {string}   displayValue   - Formatted display text for the selected value
 * @param {function} onClear        - Called when the close icon is clicked to clear selection
 * @param {function} renderDropdown - ({ ref, anchorRef, onClose }) => ReactNode
 * @param {boolean}  [isOpen]       - Controlled open state (optional)
 * @param {function} [onOpenChange] - Called with new open state when it changes (optional)
 * @param {string}   [className]    - Additional class names for the outer wrapper
 * @param {'sm'|'md'} [size]        - Size variant (default: 'md')
 */
export default function Chip({
  label,
  value,
  displayValue,
  onClear,
  renderDropdown,
  isOpen: controlledIsOpen,
  onOpenChange,
  className,
  size = 'md',
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (next) => {
    if (!isControlled) setInternalIsOpen(next);
    if (onOpenChange) onOpenChange(next);
  };

  const chipRef = useRef(null);
  const dropdownRef = useRef(null);

  const hasValue =
    value !== undefined &&
    value !== null &&
    value !== '' &&
    !(Array.isArray(value) && value.length === 0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        chipRef.current &&
        !chipRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleIconClick = (e) => {
    if (hasValue && onClear) {
      e.stopPropagation();
      onClear();
      setIsOpen(false);
    }
  };

  const isSm = size === 'sm';

  return (
    <div className={`relative inline-block${className ? ` ${className}` : ''}`} ref={chipRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center rounded-full transition-colors cursor-pointer border outline-none ${hasValue
          ? 'border-border hover:bg-offset'
          : 'border-border border-dashed hover:bg-offset'
          }`}
        style={{
          gap: isSm ? '4px' : '6px',
          padding: isSm ? '1px 6px 1px 4px' : '3px 8px 3px 6px',
        }}
      >
        {/* Left icon: addCircle when unselected, closeCircle when selected */}
        <span
          onClick={handleIconClick}
          className={`flex items-center justify-center shrink-0 ${hasValue
            ? 'text-icon-subdued hover:text-icon-default'
            : 'text-icon-subdued'
            }`}
        >
          <Icon
            name={hasValue ? 'cancelCircle' : 'addCircle'}
            className="size-[12px]"
            fill="currentColor"
          />
        </span>

        {hasValue ? (
          <>
            <span className={isSm ? 'text-label-small-emphasized text-subdued' : 'text-label-small-emphasized text-subdued'}>
              {label}
            </span>
            <div className="w-px h-2 bg-neutral-200" />
            <span className={isSm ? 'text-label-small-emphasized text-brand' : 'text-label-small-emphasized text-brand'}>
              {displayValue}
            </span>
            <Icon
              name="chevronDown"
              className={`size-[10px] transition-transform text-icon-subdued ${isOpen ? 'rotate-180' : ''}`}
              fill="currentColor"
            />
          </>
        ) : (
          <span className={isSm ? 'text-label-small text-subdued' : 'text-label-small text-subdued'}>{label}</span>
        )}
      </button>
      {isOpen &&
        renderDropdown({
          ref: dropdownRef,
          anchorRef: chipRef,
          onClose: () => setIsOpen(false),
        })}
    </div>
  );
}

/**
 * FilterChip — composes Chip + SelectDropdown for the common filter use case.
 *
 * Handles displayValue derivation, ref/anchor wiring, and close behavior
 * so consumers only need to provide options, value, and onChange.
 *
 * For custom dropdown content (e.g. DateRangePicker), use Chip directly
 * with the `renderDropdown` prop.
 */
export function FilterChip({
  label,
  options,
  value,
  onChange,
  variant = 'single',
  searchable,
  searchPlaceholder,
  className,
  size,
}) {
  const isMulti = variant === 'multi';

  const displayValue = isMulti
    ? Array.isArray(value) && value.length === 1
      ? options.find((o) => o.value === value[0])?.label || value[0]
      : `${(value || []).length} selected`
    : options.find((o) => o.value === value)?.label || value;

  const handleClear = () => {
    onChange(isMulti ? [] : '');
  };

  return (
    <Chip
      label={label}
      value={value}
      displayValue={displayValue}
      onClear={handleClear}
      className={className}
      size={size}
      renderDropdown={({ ref, anchorRef, onClose }) => (
        <SelectDropdown
          ref={ref}
          anchorRef={anchorRef}
          variant={variant}
          options={options}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          value={value}
          onChange={onChange}
          onClose={onClose}
        />
      )}
    />
  );
}
