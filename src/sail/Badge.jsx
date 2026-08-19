import React from 'react';

const Badge = ({ children, variant = 'default', className = '' }) => {
  // Map variants to Tailwind theme colors
  const variants = {
    default: 'text-badge-default-text bg-badge-default-bg border-badge-default-border',
    success: 'text-badge-success-text bg-badge-success-bg border-badge-success-border',
    warning: 'text-badge-warning-text bg-badge-warning-bg border-badge-warning-border',
    danger: 'text-badge-danger-text bg-badge-danger-bg border-badge-danger-border',
    info: 'text-badge-info-text bg-badge-info-bg border-badge-info-border',
    new: `text-brand bg-brand-50 border-brand-50`,
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-label-small rounded-sm border ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
