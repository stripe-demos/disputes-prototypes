import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../icons/SailIcons';
import useDropdownPosition from './useDropdownPosition';
import Button from './Button';
import Input from './Input';

/**
 * DateRangePicker — dual calendar with presets sidebar.
 * Renders via portal so it always appears above dialogs.
 *
 * @param {string}   value     - Current preset label or custom date string
 * @param {function} onChange  - Called with preset label or "MM/DD/YYYY - MM/DD/YYYY"
 * @param {function} onClose   - Called to close the panel
 * @param {React.RefObject} anchorRef - Ref to the trigger element for positioning
 */

const DATE_PRESETS = [
  { value: 'Today', label: 'Today' },
  { value: 'Last 7 days', label: 'Last 7 days' },
  { value: 'Last 4 weeks', label: 'Last 4 weeks' },
  { value: 'Last 3 months', label: 'Last 3 months' },
  { value: 'Last 6 months', label: 'Last 6 months' },
  { value: 'Last 12 months', label: 'Last 12 months' },
  { value: 'Month to date', label: 'Month to date' },
  { value: 'Quarter to date', label: 'Quarter to date' },
  { value: 'Year to date', label: 'Year to date' },
  { value: 'All time', label: 'All time' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isInRange(date, start, end) {
  if (!start || !end) return false;
  const time = date.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime();
  return time >= Math.min(startTime, endTime) && time <= Math.max(startTime, endTime);
}

function computePresetRange(presetValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);

  switch (presetValue) {
    case 'Today':
      return { start: new Date(today), end: new Date(today) };
    case 'Last 7 days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end };
    }
    case 'Last 4 weeks': {
      const start = new Date(today);
      start.setDate(start.getDate() - 27);
      return { start, end };
    }
    case 'Last 3 months': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 3);
      return { start, end };
    }
    case 'Last 6 months': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 6);
      return { start, end };
    }
    case 'Last 12 months': {
      const start = new Date(today);
      start.setFullYear(start.getFullYear() - 1);
      return { start, end };
    }
    case 'Month to date': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end };
    }
    case 'Quarter to date': {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarter * 3, 1);
      return { start, end };
    }
    case 'Year to date': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { start, end };
    }
    case 'All time': {
      const start = new Date(2020, 0, 1);
      return { start, end };
    }
    default:
      return { start: null, end: null };
  }
}

function formatDateField(date) {
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function parseDateField(str) {
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, m, d, y] = match;
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  const year = parseInt(y, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

const DateRangePicker = React.forwardRef(({ value, onChange, onClose, anchorRef }, ref) => {
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initialRange = value && value !== 'All time' ? computePresetRange(value) : null;
  const initialMonth =
    initialRange && initialRange.end
      ? initialRange.end.getMonth() === 0
        ? initialRange.end.getMonth()
        : initialRange.end.getMonth() - 1
      : today.getMonth() === 0
        ? 0
        : today.getMonth() - 1;
  const initialYear =
    initialRange && initialRange.end
      ? initialRange.end.getMonth() === 0
        ? initialRange.end.getFullYear() - 1
        : initialRange.end.getFullYear()
      : today.getMonth() === 0
        ? today.getFullYear() - 1
        : today.getFullYear();

  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [startDate, setStartDate] = useState(initialRange ? initialRange.start : null);
  const [endDate, setEndDate] = useState(initialRange ? initialRange.end : null);
  const [selectedPreset, setSelectedPreset] = useState(value || null);
  const [hoverDate, setHoverDate] = useState(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [startText, setStartText] = useState(initialRange ? formatDateField(initialRange.start) : '');
  const [endText, setEndText] = useState(initialRange ? formatDateField(initialRange.end) : '');

  const navigateToDate = (date) => {
    const m = date.getMonth();
    const y = date.getFullYear();
    // Show the month containing the date in the left calendar
    if (m === 0) {
      setCurrentMonth(0);
      setCurrentYear(y);
    } else {
      setCurrentMonth(m - 1);
      setCurrentYear(y);
    }
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const rightMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const rightYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  const handlePresetClick = (preset) => {
    setSelectedPreset(preset.value);
    const range = computePresetRange(preset.value);
    setStartDate(range.start);
    setEndDate(range.end);
    setStartText(formatDateField(range.start));
    setEndText(formatDateField(range.end));
    setSelectingEnd(false);
    if (range.end) navigateToDate(range.end);
  };

  const handleDayClick = (date) => {
    setSelectedPreset(null);
    if (!selectingEnd || !startDate || date < startDate) {
      setStartDate(date);
      setEndDate(null);
      setStartText(formatDateField(date));
      setEndText('');
      setSelectingEnd(true);
    } else {
      setEndDate(date);
      setEndText(formatDateField(date));
      setSelectingEnd(false);
    }
  };

  const autoFormatDateText = (newValue, prevValue) => {
    // Strip non-digit and non-slash chars
    let digits = newValue.replace(/[^\d]/g, '');
    // If user is deleting, don't auto-format
    if (newValue.length < prevValue.length) {
      return newValue.replace(/[^\d/]/g, '');
    }
    // Auto-insert slashes: MM/DD/YYYY
    if (digits.length >= 2) {
      digits = digits.slice(0, 2) + '/' + digits.slice(2);
    }
    if (digits.length >= 5) {
      digits = digits.slice(0, 5) + '/' + digits.slice(5);
    }
    return digits.slice(0, 10);
  };

  const handleStartTextChange = (e) => {
    const text = autoFormatDateText(e.target.value, startText);
    setStartText(text);
    setSelectedPreset(null);
    const parsed = parseDateField(text);
    if (parsed) {
      setStartDate(parsed);
      navigateToDate(parsed);
    }
  };

  const handleEndTextChange = (e) => {
    const text = autoFormatDateText(e.target.value, endText);
    setEndText(text);
    setSelectedPreset(null);
    const parsed = parseDateField(text);
    if (parsed) {
      setEndDate(parsed);
      if (startDate && parsed < startDate) {
        setEndDate(startDate);
        setStartDate(parsed);
        setStartText(formatDateField(parsed));
        setEndText(formatDateField(startDate));
      }
      navigateToDate(parsed);
    }
  };

  const handleApply = () => {
    if (startDate && endDate) {
      if (selectedPreset) {
        onChange(selectedPreset);
      } else {
        onChange(`${formatDateField(startDate)} - ${formatDateField(endDate)}`);
      }
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const effectiveEnd = endDate || (selectingEnd ? hoverDate : null);

  const renderCalendarMonth = (year, month) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const rows = [];
    let cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<td key={`empty-${i}`} className="p-0" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const colIndex = (firstDay + day - 1) % 7;
      // Determine the actual earlier/later dates for correct rounding
      const rangeMin = startDate && effectiveEnd
        ? (startDate <= effectiveEnd ? startDate : effectiveEnd) : null;
      const rangeMax = startDate && effectiveEnd
        ? (startDate <= effectiveEnd ? effectiveEnd : startDate) : null;
      const isRangeStart = rangeMin && isSameDay(date, rangeMin);
      const isRangeEnd = rangeMax && isSameDay(date, rangeMax);
      const isEndpoint = isSameDay(date, startDate) || isSameDay(date, effectiveEnd);
      const hasRange = rangeMin && rangeMax && !isSameDay(rangeMin, rangeMax);
      const inRange = isInRange(date, startDate, effectiveEnd) && !isEndpoint;

      // Button styling (the circular day indicator)
      let btnBg = '';
      let textClass = 'text-default';

      if (isEndpoint) {
        btnBg = 'bg-brand';
        textClass = 'text-white';
      }

      // Cell (td) styling for the continuous range band
      let cellBg = '';
      let cellRounded = '';
      const isRangeCell = inRange || (isEndpoint && hasRange);

      if (inRange) {
        cellBg = 'bg-brand-25';
      } else if (isRangeStart && hasRange) {
        cellBg = 'bg-brand-25';
        cellRounded = 'rounded-l-full';
      } else if (isRangeEnd && hasRange) {
        cellBg = 'bg-brand-25';
        cellRounded = 'rounded-r-full';
      }

      // Add rounding at row edges so the range band has rounded ends
      if (isRangeCell && colIndex === 0) {
        cellRounded += ' rounded-l-full';
      }
      if (isRangeCell && colIndex === 6) {
        cellRounded += ' rounded-r-full';
      }

      cells.push(
        <td key={day} className={`p-0 ${cellBg} ${cellRounded}`}>
          <button
            onClick={() => handleDayClick(date)}
            onMouseEnter={() => selectingEnd && setHoverDate(date)}
            className={`size-9 text-label-medium flex items-center justify-center cursor-pointer ${btnBg} ${textClass} ${isEndpoint ? 'rounded-full' : ''} ${!isEndpoint && !inRange ? 'hover:bg-offset rounded-full' : ''
              }`}
          >
            {day}
          </button>
        </td>
      );

      if ((firstDay + day) % 7 === 0) {
        rows.push(<tr key={`row-${rows.length}`} className="h-10">{cells}</tr>);
        cells = [];
      }
    }
    if (cells.length > 0) {
      while (cells.length < 7) {
        cells.push(<td key={`pad-${cells.length}`} className="p-0" />);
      }
      rows.push(<tr key={`row-${rows.length}`} className="h-8">{cells}</tr>);
    }

    return rows;
  };

  const content = (
    <div
      ref={setRefs}
      className="fixed z-[200] bg-surface rounded-xl border border-border"
      style={{
        top: pos.top,
        left: pos.left,
        boxShadow:
          '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className="flex">
        {/* Left sidebar - Presets */}
        <div className="p-2 shrink-0 space-y-1" style={{ width: '160px' }}>
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset)}
              className={`w-full text-left px-4 py-1.5 text-label-medium transition-colors cursor-pointer rounded-md ${selectedPreset === preset.value
                ? 'bg-brand-25 text-brand'
                : 'text-default hover:bg-offset'
                }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Right content area */}
        <div className="flex-1 p-4">
          {/* Date fields */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="text-label-medium text-subdued">Start</div>
              <div className="w-[130px]">
                <Input
                  size="md"
                  placeholder="MM / DD / YYYY"
                  value={startText}
                  onChange={handleStartTextChange}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-label-medium text-subdued">End</div>
              <div className="w-[130px]">
                <Input
                  size="md"
                  placeholder="MM / DD / YYYY"
                  value={endText}
                  onChange={handleEndTextChange}
                />
              </div>
            </div>
          </div>

          {/* Calendars */}
          <div className="flex gap-4">
            {/* Left calendar */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={goToPrevMonth}
                  className="size-[24px] flex items-center justify-center hover:bg-offset rounded transition-colors cursor-pointer"
                >
                  <Icon name="chevronLeft" size="xsmall" className="text-icon-subdued size-[12px]" />
                </button>
                <span className="text-label-medium text-default">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <div className="w-6" />
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {DAY_HEADERS.map((d) => (
                      <th
                        key={d}
                        className="text-label-small text-subdued pb-1 w-8 text-center font-normal"
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderCalendarMonth(currentYear, currentMonth)}</tbody>
              </table>
            </div>

            {/* Right calendar */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="w-6" />
                <span className="text-label-medium text-default">
                  {MONTH_NAMES[rightMonth]} {rightYear}
                </span>
                <button
                  onClick={goToNextMonth}
                  className="size-[24px] flex items-center justify-center hover:bg-offset rounded transition-colors cursor-pointer"
                >
                  <Icon name="chevronRight" size="xsmall" className="text-icon-subdued size-[12px]" />
                </button>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {DAY_HEADERS.map((d) => (
                      <th
                        key={d}
                        className="text-label-small text-subdued pb-1 w-8 text-center font-normal"
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderCalendarMonth(rightYear, rightMonth)}</tbody>
              </table>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 mt-2">
            <Button
              onClick={handleCancel}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!startDate || !endDate}
              variant="primary"
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
});

export { DATE_PRESETS, computePresetRange, formatDateField };
export default DateRangePicker;
