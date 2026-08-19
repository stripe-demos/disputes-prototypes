import { Icon } from '../icons/SailIcons';

export const ACCOUNT_NAME = 'Rocket Rides';
export const SANDBOX_HEIGHT = 44;

export const SandboxBanner = () => (
  <>
    <div
      className="fixed top-0 left-0 right-0 z-100 flex items-center px-5 bg-[#0E3359] text-white"
      style={{ height: SANDBOX_HEIGHT }}
    >
      <span className="text-body-small-emphasized">Sandbox</span>
      <span className="hidden lg:block absolute left-1/2 -translate-x-1/2 text-body-small text-white/80 whitespace-nowrap">
        You're testing in a sandbox. Changes you make here don't affect your live account.
      </span>
    </div>
    {/* Filler strip behind content for rounded corner reveal */}
    <div
      className="fixed left-0 right-0 bg-[#0E3359] z-[5]"
      style={{ top: SANDBOX_HEIGHT, height: 16 }}
    />
  </>
);

export const HeaderButton = ({ children, className = '', ...props }) => (
  <button
    className={`size-8 rounded-full flex items-center justify-center hover:bg-offset transition-colors cursor-pointer text-icon-default ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const Header = ({ sandboxMode = false, onMenuToggle, children }) => {
  return (
    <div className={`fixed left-0 lg:left-sidebar-width right-0 h-[60px] bg-surface border-border z-10 ${sandboxMode ? 'rounded-tl-xl lg:rounded-tl-none rounded-tr-xl overflow-hidden' : ''}`} style={{ top: sandboxMode ? SANDBOX_HEIGHT : 0 }}>
      <div className="max-w-[1280px] w-full h-full mx-auto px-4 lg:px-8 flex items-center justify-between">
        {/* Menu button + account name (mobile only) */}
        <button className="flex lg:hidden items-center gap-2 shrink-0 px-2 py-1.5 -ml-2 rounded-lg hover:bg-offset transition-colors cursor-pointer" onClick={onMenuToggle}>
          <div className="size-8 flex items-center justify-center text-icon-default">
            <Icon name="menu" size="medium" fill="currentColor" />
          </div>
          <span className="text-label-medium-emphasized text-default">{ACCOUNT_NAME}</span>
        </button>

        {/* Search */}
        <div className="hidden md:block w-[360px] lg:focus-within:w-[500px] transition-[width] duration-100 ease-in-out">
          <div className="flex items-center space-x-2 px-3 py-2 bg-offset rounded-lg">
            <Icon name="search" size="small" fill="currentColor" className="text-icon-default flex-shrink-0" />
            <input
              type="text"
              placeholder="Search"
              className="bg-transparent text-body-small text-default placeholder:text-subdued outline-none w-full"
            />
          </div>
        </div>

        {/* Actions */}
        {children}
      </div>
    </div>
  );
};
