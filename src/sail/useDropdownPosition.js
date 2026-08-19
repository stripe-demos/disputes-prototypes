import { useState, useLayoutEffect, useCallback, useRef } from 'react';

/**
 * useDropdownPosition — positions a portaled dropdown relative to an anchor element.
 * Automatically flips above/below and left/right based on available viewport space.
 * Updates position on scroll, resize, and when the dropdown's size changes.
 *
 * @param {React.RefObject} anchorRef  - Ref to the trigger element
 * @param {React.RefObject} dropdownRef - Ref to the dropdown element
 * @param {boolean} isOpen - Whether the dropdown is currently open
 * @returns {{ top: number, left: number }}
 */
export default function useDropdownPosition(anchorRef, dropdownRef, isOpen) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  // Track current direction so we can apply hysteresis to avoid oscillation
  const directionRef = useRef({ vertical: null, horizontal: null });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef?.current;
    const dropdown = dropdownRef?.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const dropdownHeight = dropdown ? dropdown.offsetHeight : 0;
    const dropdownWidth = dropdown ? dropdown.offsetWidth : 0;
    const gap = 4;
    // Hysteresis buffer — only flip when the current side is clipped by
    // at least this many px AND the other side has enough room. Prevents
    // jittery flipping right at the boundary.
    const buffer = 20;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const currentV = directionRef.current.vertical;

    if (currentV === null) {
      // First calculation — pick whichever side has more room
      directionRef.current.vertical =
        spaceBelow >= dropdownHeight + gap || spaceBelow >= spaceAbove
          ? 'below'
          : 'above';
    } else if (currentV === 'below' && spaceBelow < dropdownHeight + gap - buffer && spaceAbove >= dropdownHeight + gap) {
      directionRef.current.vertical = 'above';
    } else if (currentV === 'above' && spaceAbove < dropdownHeight + gap - buffer && spaceBelow >= dropdownHeight + gap) {
      directionRef.current.vertical = 'below';
    }

    const spaceRight = window.innerWidth - rect.left;
    const spaceLeft = rect.right;
    const currentH = directionRef.current.horizontal;

    if (currentH === null) {
      directionRef.current.horizontal =
        spaceRight >= dropdownWidth || spaceRight >= spaceLeft
          ? 'left-aligned'
          : 'right-aligned';
    } else if (currentH === 'left-aligned' && spaceRight < dropdownWidth - buffer && spaceLeft >= dropdownWidth) {
      directionRef.current.horizontal = 'right-aligned';
    } else if (currentH === 'right-aligned' && spaceLeft < dropdownWidth - buffer && spaceRight >= dropdownWidth) {
      directionRef.current.horizontal = 'left-aligned';
    }

    let top;
    if (directionRef.current.vertical === 'below') {
      top = rect.bottom + gap;
    } else {
      top = rect.top - dropdownHeight - gap;
    }

    let left;
    if (directionRef.current.horizontal === 'left-aligned') {
      left = rect.left;
    } else {
      left = rect.right - dropdownWidth;
    }

    setPos({ top, left });
  }, [anchorRef, dropdownRef]);

  useLayoutEffect(() => {
    if (!isOpen) {
      directionRef.current = { vertical: null, horizontal: null };
      return;
    }
    updatePosition();

    // Re-position on scroll (any scrollable ancestor) and resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    // Re-position when the dropdown's size changes (e.g. search filtering)
    const dropdown = dropdownRef?.current;
    let observer;
    if (dropdown) {
      observer = new ResizeObserver(updatePosition);
      observer.observe(dropdown);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      if (observer) observer.disconnect();
    };
  }, [isOpen, updatePosition, dropdownRef]);

  return pos;
}
