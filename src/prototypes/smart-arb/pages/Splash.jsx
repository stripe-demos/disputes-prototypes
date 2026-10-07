import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../../icons/SailIcons';

function MilestoneRow({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center size-9 rounded-md bg-surface border border-border shrink-0">
        <Icon name={icon} size="small" className="text-icon-default" />
      </div>
      <div>
        <h3 className="text-body-medium-emphasized text-default">{title}</h3>
        <p className="text-body-small text-subdued mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function Carousel({ slides, variant = 'card' }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const slideCount = slides.length;
  const isPlain = variant === 'plain';
  const goToSlide = (i) => setSlideIndex(i);
  const prevSlide = () => setSlideIndex((i) => (i - 1 + slideCount) % slideCount);
  const nextSlide = () => setSlideIndex((i) => (i + 1) % slideCount);

  return (
    <div className={isPlain ? '' : 'mt-8'}>
      <div
        className={`relative left-1/2 -translate-x-1/2 w-[60vw] max-w-[1100px] ${isPlain ? '' : 'rounded-2xl border border-border bg-offset min-h-[340px]'}`}
      >
        <div className="overflow-hidden rounded-2xl">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              width: `${slideCount * 100}%`,
              transform: `translateX(-${(100 / slideCount) * slideIndex}%)`,
            }}
          >
            {slides.map((slide) => (
              <div
                key={slide.label}
                style={{ width: `${100 / slideCount}%` }}
                className={`shrink-0 flex items-center ${isPlain ? 'min-h-[400px] px-0 py-6' : 'px-10 py-12'}`}
              >
                <div className="w-full">{slide.render()}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous slide"
          className="absolute -left-16 top-1/2 -translate-y-1/2 size-9 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-offset"
        >
          <Icon name="chevronLeft" size="small" className="text-default" />
        </button>
        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          className="absolute -right-16 top-1/2 -translate-y-1/2 size-9 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-offset"
        >
          <Icon name="chevronRight" size="small" className="text-default" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.label}
            type="button"
            onClick={() => goToSlide(i)}
            aria-label={slide.label}
            className={`size-2 rounded-full transition-colors duration-150 ${i === slideIndex ? 'bg-brand' : 'bg-neutral-200 hover:bg-neutral-300'}`}
          />
        ))}
      </div>
    </div>
  );
}

function HeroSlide({ badge, title, description, footer, extra, gradient }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center w-full">
      <div className="flex flex-col gap-5">
        <span className="inline-flex self-start text-label-small-emphasized text-brand border border-brand rounded-full px-3 py-1">
          {badge}
        </span>
        <div>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-default leading-tight whitespace-pre-line">
            {title}
          </h2>
          <p className="mt-4 text-[clamp(0.9rem,1.4vw,1.0625rem)] text-subdued max-w-[340px]">{description}</p>
        </div>
        {extra}
        {footer && <p className="text-label-small text-subdued">{footer}</p>}
      </div>
      <div className="flex justify-center md:justify-end">
        <div className="w-full max-w-[360px] aspect-[4/3] rounded-[20px]" style={{ background: gradient }} />
      </div>
    </div>
  );
}

const GRADIENTS = {
  opportunity: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 18%, #4338ca 40%, #1e1b4b 50%, #4338ca 60%, #c7d2fe 82%, #ffffff 100%)',
  impact: 'linear-gradient(115deg, #ffffff 0%, #bfdbfe 20%, #2563eb 42%, #172554 50%, #2563eb 58%, #bfdbfe 80%, #ffffff 100%)',
  milestones: 'linear-gradient(160deg, #ffffff 0%, #ddd6fe 18%, #6d28d9 40%, #2e1065 50%, #6d28d9 60%, #ddd6fe 82%, #ffffff 100%)',
};

const OVERVIEW_SLIDES = [
  {
    label: 'The opportunity',
    render: () => (
      <HeroSlide
        badge="Public Preview"
        title={'Smart\nArbitration'}
        description="Automating appeal responses to improve revenue recovery for Stripe users."
        footer="10.07.26"
        gradient={GRADIENTS.opportunity}
      />
    ),
  },
  {
    label: 'Impact so far',
    render: () => (
      <HeroSlide
        badge="Pilot results"
        title={'Impact\nso far'}
        description="Early, directional numbers from the Smart Disputes pilot — to be replaced with real metrics."
        gradient={GRADIENTS.impact}
        extra={
          <div className="flex flex-col gap-1.5">
            <p className="text-body-small text-default"><span className="text-body-medium-emphasized text-brand">40%</span> of eligible disputes get automated evidence today</p>
            <p className="text-body-small text-default"><span className="text-body-medium-emphasized text-brand">2.5 days → 20 min</span> to prepare and send a response</p>
            <p className="text-body-small text-default"><span className="text-body-medium-emphasized text-brand">Pilot live</span> for early appeals recovering lost revenue</p>
          </div>
        }
      />
    ),
  },
  {
    label: 'Upcoming milestones',
    render: () => (
      <HeroSlide
        badge="Roadmap"
        title={'Upcoming\nmilestones'}
        description="What's next as we extend Smart Disputes into arbitration."
        gradient={GRADIENTS.milestones}
        extra={
          <div className="flex flex-col gap-3">
            <MilestoneRow icon="document" title="Expand automated evidence coverage" description="More dispute reasons beyond the current pilot set." />
            <MilestoneRow icon="gavel" title="Launch arbitration appeals in limited beta" description="Automate appeal filings for a small set of merchants." />
            <MilestoneRow icon="flag" title="Build decision support for escalation thresholds" description="Visibility into when and why a dispute escalates." />
          </div>
        }
      />
    ),
  },
];

const DECISIONS = [
  {
    label: 'Decision 1 — Escalation order',
    render: () => (
      <div className="flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1">
          <h2 className="text-heading-small text-default">Decision 1 — Escalation order</h2>
          <p className="text-body-large text-subdued mt-3">
            Where should the line sit between fully automated response/appeal handling and
            merchant-reviewed decisions? Does arbitration kick off automatically once a response
            is lost, or does it wait on merchant review first?
          </p>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="rounded-2xl bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-border p-6 w-full max-w-[280px] flex flex-col items-center gap-3 text-center">
            <div className="size-12 rounded-full bg-brand/10 flex items-center justify-center">
              <Icon name="flag" size="medium" className="text-brand" />
            </div>
            <div>
              <p className="text-body-medium-emphasized text-default">Automatic vs. merchant-reviewed</p>
              <p className="text-body-small text-subdued mt-0.5">Where arbitration kicks off</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: 'Decision 2 — Enablement approach',
    render: () => (
      <div className="flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1">
          <h2 className="text-heading-small text-default">Decision 2 — Enablement approach</h2>
          <p className="text-body-large text-subdued mt-3">
            How much policy document and data connection setup should we expect from merchants
            before trusting automation? Do we gate arbitration on a minimum enablement bar, or
            let it run with partial coverage?
          </p>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="rounded-2xl bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-border p-6 w-full max-w-[280px] flex flex-col items-center gap-3 text-center">
            <div className="size-12 rounded-full bg-brand/10 flex items-center justify-center">
              <Icon name="clipboardCheck" size="medium" className="text-brand" />
            </div>
            <div>
              <p className="text-body-medium-emphasized text-default">Minimum enablement bar</p>
              <p className="text-body-small text-subdued mt-0.5">Full setup vs. partial coverage</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

const TABS = ['Overview', 'Decisions needed', 'Prototypes'];

export default function Splash({ basePath = '' }) {
  const navigate = useNavigate();
  const PROTOTYPE_CARDS = [
    {
      title: 'Discovery',
      description: 'See how a merchant first learns a lost dispute may be worth appealing, starting from their inbox.',
      icon: 'search',
      href: `${basePath}/discovery`,
    },
    {
      title: 'Enablement',
      description: 'Set up policy documents and data connections so automation has what it needs.',
      icon: 'clipboardCheck',
      href: `${basePath}/settings/payments?tab=disputes`,
    },
    {
      title: 'Management',
      description: 'Review and triage disputes across the full activity list.',
      icon: 'listView',
      href: `${basePath}/disputes`,
    },
  ];
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="min-h-screen bg-surface">
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-border">
        <div className="w-full px-6 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <span className="text-label-medium-emphasized text-default font-bold">Smart arbitration</span>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {TABS.map((tab) => {
              const active = tab === activeTab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`text-label-medium-emphasized rounded-full px-4 py-2 border transition-colors duration-150 ${active
                    ? 'bg-offset border-neutral-300 text-default'
                    : 'bg-surface border-border text-default hover:bg-offset'
                    }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <a
            href="https://hubble.corp.stripe.com/viz/dashboards/71030--smart-arb-aggregate-dashboard?tab=Executive+summary"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-label-medium-emphasized text-brand justify-self-end hover:underline"
          >
            Results dashboard
            <Icon name="arrowUpRight" size="xsmall" />
          </a>
        </div>
      </div>

      <div className="flex items-start justify-center px-6 py-16">
        <div className="w-full max-w-[920px]">
          {(activeTab === 'Overview' || activeTab === 'Decisions needed') && (
            <div className="border border-dashed border-border rounded-lg py-16 px-8 flex flex-col items-center justify-center">
              <p className="text-body-medium-emphasized text-default">Nothing here yet</p>
              <p className="text-body-small text-subdued mt-1">This section is being reworked — check back soon.</p>
            </div>
          )}

          {activeTab === 'Prototypes' && (
            <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              {PROTOTYPE_CARDS.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => navigate(card.href)}
                  className="text-left rounded-[12px] border border-border bg-surface overflow-hidden hover:border-neutral-300 transition-colors duration-150"
                >
                  <div className="w-full aspect-[16/10] bg-offset flex items-center justify-center">
                    <div className="size-12 rounded-full bg-brand/10 flex items-center justify-center">
                      <Icon name={card.icon} size="medium" className="text-brand" />
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-body-medium-emphasized text-default">{card.title}</p>
                    <p className="text-body-small text-subdued mt-0.5">{card.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
