import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Breadcrumb, Button, Link } from '../../../sail';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';
import { RULES, RULE_ACTION_OPTIONS } from './RadarRules';

function formatDateCreated(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ConditionText({ actionLabel, condition, highlighted = false }) {
  const parts = condition.split(/(:[a-zA-Z_]+:)/g);
  return (
    <span className={highlighted ? 'text-body-medium text-default' : 'text-body-small text-subdued'}>
      {highlighted && `${actionLabel} `}
      {parts.map((part, i) =>
        /^:[a-zA-Z_]+:$/.test(part) ? (
          <span key={i} className="bg-blurple/10 text-brand rounded px-1">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function EditRuleDrawer({ open, onClose, rule, actionLabel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[480px] max-w-full h-full bg-surface shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-heading-medium text-default">Edit a transaction rule</h2>
          <button onClick={onClose} className="text-icon-subdued hover:text-default cursor-pointer" aria-label="Close">
            <Icon name="cancel" size="small" fill="currentColor" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h3 className="text-heading-small text-default mb-3">Condition</h3>
          <div className="border border-border rounded-lg p-4">
            <ConditionText actionLabel={actionLabel} condition={rule.condition} highlighted />
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
              <button className="inline-flex items-center gap-1.5 text-body-small-emphasized text-default cursor-pointer">
                <Icon name="add" size="xsmall" fill="currentColor" />
                Attributes
              </button>
              <button className="inline-flex items-center gap-1.5 text-body-small-emphasized text-default cursor-pointer">
                <Icon name="list" size="xsmall" fill="currentColor" />
                Lists
              </button>
            </div>
          </div>

          <p className="text-body-small text-subdued mt-4">
            Dispute resolution reduces costs and dispute rates by automatically resolving or deflecting chargebacks. You can set rules in Radar to resolve eligible disputes, send additional transaction data to deflect others, or block disputes entirely.
          </p>

          <button className="inline-flex items-center gap-1 text-body-small-emphasized text-default mt-4 cursor-pointer">
            Example rules
            <Icon name="chevronDown" size="xsmall" fill="currentColor" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <p className="text-body-small text-subdued">
            Read more about <Link href="#" variant="primary" className="text-body-small">how to write rules</Link>.
          </p>
          <Button variant="primary" size="md">Test rule</Button>
        </div>
      </div>
    </div>
  );
}

export default function RadarRuleDetail() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [editOpen, setEditOpen] = useState(false);

  const index = RULES.findIndex((r) => String(r.id) === ruleId);
  const rule = RULES[index];

  if (!rule) {
    return (
      <div>
        <p className="text-body-small text-subdued">Rule not found.</p>
      </div>
    );
  }

  const actionLabel = RULE_ACTION_OPTIONS.find((o) => o.value === rule.action)?.label || rule.action;
  const prevRule = index > 0 ? RULES[index - 1] : null;
  const nextRule = index < RULES.length - 1 ? RULES[index + 1] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Breadcrumb
          pages={[
            { label: 'Radar', to: `${basePath}/radar/rules` },
            { label: 'Rules', to: `${basePath}/radar/rules` },
          ]}
          showCurrentPage={false}
        />
        <div className="flex items-center gap-4">
          <button
            className={`inline-flex items-center gap-1 text-body-small-emphasized ${prevRule ? 'text-brand cursor-pointer' : 'text-subdued cursor-not-allowed'}`}
            disabled={!prevRule}
            onClick={() => prevRule && navigate(`${basePath}/radar/rules/${prevRule.id}`)}
          >
            <Icon name="arrowLeft" size="xsmall" fill="currentColor" />
            Previous rule
          </button>
          <button
            className={`inline-flex items-center gap-1 text-body-small-emphasized ${nextRule ? 'text-brand cursor-pointer' : 'text-subdued cursor-not-allowed'}`}
            disabled={!nextRule}
            onClick={() => nextRule && navigate(`${basePath}/radar/rules/${nextRule.id}`)}
          >
            Next rule
            <Icon name="arrowRight" size="xsmall" fill="currentColor" />
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-heading-xlarge text-default">{actionLabel}</h1>
          <Badge variant={rule.status === 'enabled' ? 'success' : 'default'}>
            {rule.status === 'enabled' ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={() => setEditOpen(true)}>Edit</Button>
          <Button variant="secondary" size="md" icon="more" />
        </div>
      </div>

      <ConditionText actionLabel={actionLabel} condition={rule.condition} />

      <div className="flex gap-8 mt-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-small text-default">0 matching disputes</h2>
            <button className="inline-flex items-center gap-2 border border-border rounded-md px-3 py-1.5 text-body-small text-default cursor-pointer">
              <Icon name="calendar" size="xsmall" fill="currentColor" />
              Sep 12–Sep 29
            </button>
          </div>
          <div className="border border-dashed border-border rounded-lg py-16 px-8 flex flex-col items-center justify-center">
            <p className="text-body-medium-emphasized text-default">0 matching disputes</p>
            <p className="text-body-small text-subdued mt-1">No disputes matched this rule during this period.</p>
          </div>
        </div>

        <div className="w-[260px] shrink-0">
          <h2 className="text-heading-small text-default mb-4">About this rule</h2>

          <div className="mb-4">
            <p className="text-label-small-emphasized text-default">Traffic allocation</p>
            <p className="text-body-medium text-default mt-1">{rule.traffic}%</p>
            <Link href="#" variant="primary" className="text-body-small mt-1">View docs</Link>
          </div>

          <div className="mb-4">
            <p className="text-label-small-emphasized text-default">Rule ID</p>
            <p className="text-body-small text-subdued mt-1 break-all">{rule.ruleId}</p>
          </div>

          <div>
            <p className="text-label-small-emphasized text-default">Date created</p>
            <p className="text-body-small text-subdued mt-1">{formatDateCreated(rule.dateCreated)}</p>
          </div>
        </div>
      </div>

      <EditRuleDrawer open={editOpen} onClose={() => setEditOpen(false)} rule={rule} actionLabel={actionLabel} />
    </div>
  );
}
