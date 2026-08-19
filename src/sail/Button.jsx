import React from 'react';
import { Icon } from '../icons/SailIcons';

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon,
  href,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-[6px] shrink-0 whitespace-nowrap transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0,0.09,0.4,1)] hover:duration-0 focus:outline-none focus:ring-[rgba(8,142,249,0.36)] focus:ring-4';

  // topShadow + keyline composited as box-shadow layers (matches pay-server's Sail Button)
  // topShadow sits above the keyline in the shadow stack, creating an inset shadow effect on the border
  const variants = {
    primary: 'bg-button-primary-bg text-button-primary-text active:bg-button-primary-pressed disabled:opacity-50 shadow-[0px_1px_1px_0px_rgba(20,19,78,0.32),0_0_0_1px_var(--color-button-primary-border)] hover:shadow-[0px_1px_1px_0px_rgba(20,19,78,0.32),0_0_0_1px_var(--color-button-primary-border-hover)] active:shadow-[0px_-1px_1px_0px_rgba(20,19,78,0.32),0_0_0_1px_var(--color-button-primary-border-hover)]',
    secondary: 'bg-button-secondary-bg text-button-secondary-text active:bg-button-secondary-pressed disabled:opacity-50 shadow-[0px_1px_1px_0px_rgba(16,17,26,0.16),0_0_0_1px_var(--color-button-secondary-border)] hover:shadow-[0px_1px_1px_0px_rgba(16,17,26,0.16),0_0_0_1px_var(--color-button-secondary-border-hover)] active:shadow-[0px_-1px_1px_0px_rgba(16,17,26,0.16),0_0_0_1px_var(--color-button-secondary-border)]',
    danger: 'bg-button-danger-bg text-button-danger-text active:bg-button-danger-pressed disabled:opacity-50 shadow-[0px_1px_1px_0px_rgba(62,2,26,0.32),0_0_0_1px_var(--color-button-danger-border)] hover:shadow-[0px_1px_1px_0px_rgba(62,2,26,0.32),0_0_0_1px_var(--color-button-danger-border-hover)] active:shadow-[0px_-1px_1px_0px_rgba(62,2,26,0.32),0_0_0_1px_var(--color-button-danger-border)]',
  };

  const sizes = {
    sm: 'h-[24px] py-[4px] px-[8px] text-label-small-emphasized gap-[4px]',
    md: 'h-[28px] py-[4px] px-[8px] text-label-medium-emphasized gap-[6px]',
    lg: 'h-[40px] py-[8px] px-[16px] text-label-large-emphasized gap-[8px]',
  };

  // Map button size to icon size
  const iconSizes = {
    sm: 'xsmall',
    md: 'xsmall',
    lg: 'small',
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'} ${className}`;

  const content = (
    <>
      {icon && <Icon name={icon} size={iconSizes[size]} fill="currentColor" />}
      {children}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={combinedClassName}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={combinedClassName}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;
