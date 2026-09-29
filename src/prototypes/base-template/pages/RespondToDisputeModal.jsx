import { useState } from 'react';
import { Dialog, Button, Badge, Link, Switch, Toggle, ToggleGroup } from '../../../sail';
import { Icon } from '../../../icons/SailIcons';
import { DISPUTE_REASON_LABELS, formatCurrency } from '../data/disputes';

const CHECKLIST = [
  { key: 'shipping', label: 'Shipping information', total: 2, impact: 'High impact' },
  { key: 'policies', label: 'Policies', total: 2, impact: 'High impact' },
  { key: 'additional', label: 'Additional evidence', total: null, impact: null },
];

function ChecklistRow({ item, expanded, onToggle }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 py-4 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="size-4 rounded-full border-2 border-border shrink-0" />
          <span className="text-label-medium-emphasized text-default">{item.label}</span>
          {item.total != null && (
            <span className="text-label-medium text-subdued">0/{item.total}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {item.impact && <Badge variant="success">{item.impact}</Badge>}
          <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size="small" fill="currentColor" className="text-icon-subdued" />
        </div>
      </button>
    </div>
  );
}

export default function RespondToDisputeModal({ open, onClose, dispute, onReviewEvidence }) {
  const [responseType, setResponseType] = useState('smart');
  const [autoRespond, setAutoRespond] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);

  if (!dispute) return null;

  const reasonLabel = (DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason || '').toLowerCase();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xlarge"
      title={
        <div className="flex items-center justify-between pr-8">
          <span>Respond to dispute</span>
          <div className="flex items-center gap-3 shrink-0">
            <Switch checked={autoRespond} onChange={(e) => setAutoRespond(e.target.checked)} />
            <span className="text-label-medium-emphasized text-default whitespace-nowrap">
              Auto-respond with Smart Disputes
            </span>
            <span className="text-label-small text-subdued whitespace-nowrap">Last saved at 12:00 PM</span>
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" size="md" onClick={onClose}>Back</Button>
          <Button variant="primary" size="md" onClick={onReviewEvidence}>Review evidence</Button>
        </div>
      }
    >
      <div>
        <h2 className="text-heading-large text-default mb-4">Respond to dispute</h2>

        <div className="bg-offset rounded-lg p-3 flex items-center justify-between gap-3 mb-5">
          <p className="text-body-small text-subdued">
            Stripe's built a strategy for your {formatCurrency(dispute.amount, dispute.currency)} dispute. The
            customer claims {reasonLabel}.
          </p>
          <Link href="#" variant="primary" className="text-body-small shrink-0">View</Link>
        </div>

        <ToggleGroup layout="horizontal">
          <div className="relative">
            <span className="absolute -top-2 left-3 z-10">
              <Badge variant="new">Recommended</Badge>
            </span>
            <Toggle
              icon={(props) => <Icon name="disputeSmart" {...props} fill="currentColor" />}
              title="Respond with Smart Disputes"
              description="We already prepared most of the evidence for this dispute."
              selected={responseType === 'smart'}
              onClick={() => setResponseType('smart')}
            />
          </div>
          <Toggle
            icon={(props) => <Icon name="edit" {...props} fill="currentColor" />}
            title="Respond manually"
            description="You prepare and send your own evidence. We fill in payment and customer details."
            selected={responseType === 'manual'}
            onClick={() => setResponseType('manual')}
          />
        </ToggleGroup>

        <div className="mt-6">
          <p className="text-body-medium text-default mb-3">
            <span className="text-body-medium-emphasized">Your evidence.</span> Stripe has compiled enough
            evidence to respond to this dispute. We recommend you keep adding evidence to strengthen your
            response.
          </p>
          <div className="relative h-2 rounded-full bg-offset mb-2">
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand-500" style={{ width: '65%' }} />
            <span
              className="absolute top-1/2 size-2.5 rounded-full bg-surface border-2 border-brand-500 -translate-y-1/2 -translate-x-1/2"
              style={{ left: '65%' }}
            />
          </div>
        </div>

        <div className="mt-2">
          {CHECKLIST.map((item) => (
            <ChecklistRow
              key={item.key}
              item={item}
              expanded={expandedKey === item.key}
              onToggle={() => setExpandedKey((k) => (k === item.key ? null : item.key))}
            />
          ))}
        </div>
      </div>
    </Dialog>
  );
}
