import { useNavigate } from 'react-router-dom';
import { useBasePath } from '../../contexts/BasePath';
import { HeaderButton } from '../../sail/Header';
import { Icon } from '../../icons/SailIcons';
import { DiamondAppIcon, BoatAppIcon, ZapAppIcon } from '../../icons/AppIcons';

export default function HeaderNav() {
  const navigate = useNavigate();
  const basePath = useBasePath();

  return (
    <div className="flex items-center">
      {/* App Dock - desktop only */}
      <div className="hidden lg:flex items-center gap-0.5 px-px py-px border border-neutral-50 rounded-full mr-4">
        <HeaderButton>
          <DiamondAppIcon />
        </HeaderButton>
        <HeaderButton>
          <BoatAppIcon />
        </HeaderButton>
        <HeaderButton>
          <ZapAppIcon />
        </HeaderButton>
        <HeaderButton className="text-icon-default">
          <Icon name="apps" size="small" />
        </HeaderButton>
      </div>

      <div className="flex items-center space-x-3 lg:space-x-1.5">
        <HeaderButton className="lg:hidden">
          <Icon name="apps" className="size-[20px]" />
        </HeaderButton>
        <HeaderButton className="hidden lg:flex">
          <Icon name="help" className="size-[16px]" />
        </HeaderButton>
        <HeaderButton>
          <Icon name="notifications" className="size-[20px] lg:size-[16px]" />
        </HeaderButton>
        <HeaderButton onClick={() => navigate(`${basePath}/settings`)}>
          <Icon name="settings" className="size-[20px] lg:size-[16px]" />
        </HeaderButton>
        <HeaderButton className="hidden lg:flex">
          <Icon name="addCircleFilled" className="text-brand-500 lg:size-[20px]" />
        </HeaderButton>
      </div>
    </div>
  );
}
