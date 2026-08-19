import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Checkbox } from './Input';
import { Icon } from '../icons/SailIcons';
import { FlagIcon } from '../icons/SailFlagIcons';
import useDropdownPosition from './useDropdownPosition';

/**
 * SelectDropdown — unified dropdown for single-select and multi-select use cases.
 * Renders via portal so it always appears above dialogs and other stacking contexts.
 * Automatically flips above/below the anchor based on viewport space.
 *
 * @param {'single'|'multi'} variant   - Selection mode (default: 'single')
 * @param {Array}    options           - [{ value, label, icon?, flagCode? }]
 *                                       icon: string rendered inline (e.g. emoji)
 *                                       flagCode: 2-letter country code rendered via FlagIcon
 * @param {string|string[]} value      - Selected value(s). String for single, array for multi
 * @param {function} onChange          - Called with selected value (single) or array (multi)
 * @param {function} onClose           - Called to close the panel (single-select calls this on selection)
 * @param {boolean}  searchable        - Show search field at top (default: false)
 * @param {string}   searchPlaceholder - Placeholder text for search input (default: 'Search...')
 * @param {React.RefObject} anchorRef  - Ref to the trigger element for positioning
 */
const SelectDropdown = React.forwardRef(
  (
    {
      variant = 'single',
      options,
      value,
      onChange,
      onClose,
      searchable = false,
      searchPlaceholder = 'Search...',
      anchorRef,
    },
    ref
  ) => {
    const [searchTerm, setSearchTerm] = useState('');
    const innerRef = useRef(null);

    const setRefs = useCallback(
      (node) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    const pos = useDropdownPosition(anchorRef, innerRef, true);

    const filtered =
      searchable && searchTerm
        ? options.filter((o) =>
          o.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : options;

    const content = (
      <div
        ref={setRefs}
        className="fixed z-[200] bg-surface rounded-lg border border-border px-[4px]"
        style={{
          top: pos.top,
          left: pos.left,
          minWidth: variant === 'multi' ? '200px' : '180px',
          maxHeight: '320px',
          boxShadow:
            '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        {searchable && (
          <div className="flex items-center gap-2 -mx-[4px] px-2 py-2 border-b border-border">
            <Icon
              name="search"
              size="xsmall"
              className="shrink-0 text-placeholder"
              fill="currentColor"
            />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-label-small text-default w-full placeholder:text-placeholder"
              autoFocus
            />
          </div>
        )}
        <div
          style={{
            maxHeight: searchable ? '240px' : '280px',
            overflowY: 'auto',
          }}
          className="py-[4px]"
        >
          {variant === 'multi' ? (
            <MultiSelectContent
              options={filtered}
              value={value}
              onChange={onChange}
            />
          ) : (
            <SingleSelectContent
              options={filtered}
              value={value}
              onChange={onChange}
              onClose={onClose}
            />
          )}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-label-small text-placeholder">
              No results found
            </div>
          )}
        </div>
      </div>
    );

    return ReactDOM.createPortal(content, document.body);
  }
);

/* ── Option icon helper ── */

function OptionIcon({ option }) {
  if (option.flagCode) {
    return <FlagIcon name={option.flagCode} size="small" />;
  }
  if (option.icon) {
    return <span style={{ fontSize: '12px' }}>{option.icon}</span>;
  }
  return null;
}

/* ── Single-select internals ── */

function SingleSelectContent({ options, value, onChange, onClose }) {
  const selectedValue =
    typeof value === 'string'
      ? value
      : Array.isArray(value) && value.length > 0
        ? value[0]
        : '';

  return options.map((option) => {
    const isSelected = option.value === selectedValue;
    const hasIcon = option.icon || option.flagCode;
    return (
      <button
        key={option.value}
        onClick={() => {
          onChange(option.value);
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 rounded-md text-label-medium transition-colors flex items-center justify-between hover:bg-offset text-default cursor-pointer"
      >
        <span className={hasIcon ? 'flex items-center gap-2' : undefined}>
          <OptionIcon option={option} />
          <span>{option.label}</span>
        </span>
        {isSelected && (
          <Icon name="checkCircleFilled" className="size-[12px] text-icon-default" fill="currentColor" />
        )}
      </button>
    );
  });
}

/* ── Multi-select internals ── */

function MultiSelectContent({ options, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  const allSelected = selected.length === options.length;

  const toggleOption = (optionValue) => {
    if (selected.includes(optionValue)) {
      onChange(selected.filter((v) => v !== optionValue));
    } else {
      onChange([...selected, optionValue]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  return (
    <>
      <div
        className={`px-2 py-1 rounded-md text-label-medium transition-colors cursor-pointer ${allSelected ? 'text-brand' : 'text-default hover:bg-offset'
          }`}
      >
        <Checkbox
          checked={allSelected}
          onChange={toggleAll}
          label={
            <span className="text-label-small-emphasized">
              {selected.length === 0
                ? `Select all (${options.length})`
                : `${selected.length} selected`}
            </span>
          }
        />
      </div>
      <div className="my-0.5" />
      {options.map((option) => {
        const isChecked = selected.includes(option.value);
        return (
          <div
            key={option.value}
            className={`px-2 py-1 rounded-md text-label-medium transition-colors cursor-pointer ${isChecked
              ? 'text-brand'
              : 'text-default hover:bg-offset'
              }`}
          >
            <Checkbox
              checked={isChecked}
              onChange={() => toggleOption(option.value)}
              label={
                <span className="text-label-medium flex items-center gap-2">
                  <OptionIcon option={option} />
                  {option.label}
                </span>
              }
            />
          </div>
        );
      })}
    </>
  );
}

export { COUNTRIES } from '../data/countries';
export default SelectDropdown;
