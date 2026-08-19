import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';
import { track } from '@vercel/analytics';
import { Button } from '../../../sail';

const PageCard = ({ icon, title, to, onClick }) => {
  const className = "flex items-center gap-3 p-3.5 rounded-lg border border-border bg-surface hover:bg-offset transition-colors text-left cursor-pointer";
  const content = (
    <>
      <Icon name={icon} size="small" className="text-icon-subdued shrink-0" />
      <div>
        <p className="text-label-medium-emphasized text-default">{title}</p>
      </div>
      <Icon name="chevronRight" className="size-[12px] text-icon-subdued shrink-0 ml-auto" />
    </>
  );

  if (to) {
    return <Link to={to} className={className}>{content}</Link>;
  }
  return <button onClick={onClick} className={className}>{content}</button>;
};

export default function Home() {
  const basePath = useBasePath();
  const [, setSearchParams] = useSearchParams();
  return (
    <div>
      <div className="bg-offset p-8 rounded-xl max-w-[800px] space-y-8">
        <div className="space-y-1">
          <h1 className="text-heading-xlarge text-default">Welcome</h1>
          <p className="text-body-medium text-default mb-4">
            A pre-built dashboard shell with sidebar, header, routing, and multi-prototype support. You can create a new repository on Github using this starter as a template.
          </p>
          <Button
            href="https://github.com/new?owner=stripe-demos&template_name=sail-dashboard-starter&template_owner=stripe-demos&no_redirect=true"
            target="_blank"
            rel="noopener noreferrer"
            icon="external"
            variant="primary"
            onClick={() => track('use_this_template')}
          >
            Use this template
          </Button>
        </div>
        <div className="space-y-2">
          <h2 className="text-heading-small text-default">Sample pages</h2>
          <div className="grid grid-cols-2 gap-2">
            <PageCard icon="business" title="Connected accounts list" to={`${basePath}/connect/accounts`} />
            <PageCard icon="settings" title="Settings page" to={`${basePath}/settings`} />
            <PageCard icon="api" title="Open Workbench" onClick={() => setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('workbench', 'show');
              return next;
            })} />
            <PageCard icon="product" title="View components" to={`${basePath}/components`} />
          </div>
        </div>
      </div>
    </div>
  );
}
