import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Icon } from '../icons/SailIcons';

const Dialog = ({
  open,
  onClose,
  title,
  subtitle,
  footer,
  size = 'medium',
  children,
  className = '',
  overlayClassName = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const contentRef = useRef(null);

  const updateScrollState = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 1);
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  }, []);

  const sizes = {
    small: 'max-w-[368px]',
    medium: 'max-w-[496px]',
    large: 'max-w-[648px]',
    xlarge: 'max-w-[944px]',
    full: 'w-[calc(100vw-32px)] h-[calc(100vh-32px)]',
  };

  // Handle open/close state with animation
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
    } else if (isVisible) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when open, but keep scrollbar gutter to avoid layout shift
  useEffect(() => {
    if (isVisible) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [isVisible]);

  // Track content overflow on open and when content resizes
  useEffect(() => {
    if (!isVisible) return;
    updateScrollState();
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    // Also observe the scroll content in case children resize
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [isVisible, updateScrollState]);

  if (!isVisible) return null;

  const hasHeader = title || subtitle;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isClosing ? 'animate-[fadeOut_150ms_ease-in_forwards]' : 'animate-[fadeIn_150ms_ease-out]'} ${overlayClassName}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-overlay-backdrop"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`relative bg-surface rounded-lg shadow-xl flex flex-col max-h-[calc(100vh-64px)] ${size !== 'full' ? 'w-full' : ''} ${isClosing ? 'animate-[scaleOut_150ms_ease-in_forwards]' : 'animate-[scaleIn_150ms_ease-out]'} ${sizes[size]} ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 size-7 flex items-center justify-center rounded text-icon-subdued hover:bg-offset transition-colors cursor-pointer"
          aria-label="Close"
        >
          <Icon name="cancel" size="xxsmall" fill="currentColor" />
        </button>

        {/* Header */}
        {hasHeader && (
          <div className={`px-[16px] pt-[16px] pb-4 shrink-0 border-b transition-colors ${canScrollUp ? 'border-border' : 'border-transparent'}`}>
            {title && (
              <h2 className="text-body-large-emphasized text-default pr-8">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-body-small text-subdued">{subtitle}</p>
            )}
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          onScroll={updateScrollState}
          className={`px-[16px] overflow-y-auto min-h-0 ${hasHeader ? 'pb-[16px]' : 'py-[16px]'} ${footer ? '' : 'pb-[16px]'}`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-[16px] py-4 shrink-0 border-t transition-colors ${canScrollDown ? 'border-border' : 'border-transparent'}`}>
            <div className="flex justify-end gap-2">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dialog;
