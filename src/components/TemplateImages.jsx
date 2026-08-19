const BG = '#f7f8fa';
const BORDER = '#e3e8ee';
const SIDEBAR = '#ffffff';
const MUTED = '#c1c9d2';
const LIGHT = '#e8ecf1';

function TemplateImg({ src, alt }) {
  return <img src={src} alt={alt} className="w-full h-auto block" />;
}

function EmptyImage() {
  const W = 1457;
  const H = 687;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={BG} />
      <rect x="364" y="244" width="729" height="300" rx="16" fill={SIDEBAR} stroke={BORDER} strokeWidth="3" />
      <rect x="572" y="330" width="313" height="26" rx="8" fill={MUTED} />
      <rect x="520" y="386" width="417" height="16" rx="6" fill={LIGHT} />
      <rect x="551" y="424" width="355" height="16" rx="6" fill={LIGHT} />
    </svg>
  );
}

const TEMPLATE_IMAGES = {
  'dashboard-shell': <TemplateImg src="/template-dashboard.png" alt="Dashboard shell template" />,
  'stripe-docs': <TemplateImg src="/template-docs.png" alt="Stripe docs template" />,
  'empty': <EmptyImage />,
};

export default TEMPLATE_IMAGES;
