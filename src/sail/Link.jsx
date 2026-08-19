import { Icon } from '../icons/SailIcons';

const Link = ({
  children,
  href,
  variant = 'primary',
  disabled = false,
  external = false,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'text-brand hover:text-button-primary-pressed',
    secondary: 'text-default underline underline-offset-2 hover:text-default',
  };

  const combinedClassName = `inline-flex items-center gap-1 transition-colors ${variants[variant]} ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'} ${className}`;

  const externalProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <a
      href={disabled ? undefined : href}
      className={combinedClassName}
      aria-disabled={disabled || undefined}
      {...externalProps}
      {...props}
    >
      {children}
      {external && <Icon name="external" size="xsmall" fill="currentColor" />}
    </a>
  );
};

export default Link;
