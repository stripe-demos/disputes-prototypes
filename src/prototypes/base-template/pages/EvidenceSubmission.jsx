import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Breadcrumb, Button, Textarea } from '../../../sail';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';
import { getDisputeById, formatCurrency } from '../data/disputes';

const FIELDS = [
  {
    key: 'productDescription',
    label: 'Product description',
    description: 'Describe the product or service that was sold.',
  },
  {
    key: 'customerCommunication',
    label: 'Customer communication',
    description: 'Any communication with the customer relevant to this dispute.',
  },
  {
    key: 'shippingDocumentation',
    label: 'Shipping documentation',
    description: 'Proof the product was delivered, such as a tracking number.',
  },
  {
    key: 'refundPolicy',
    label: 'Refund and cancellation policy',
    description: 'Your refund and cancellation policy, if applicable.',
  },
  {
    key: 'uncategorized',
    label: 'Additional evidence',
    description: 'Any other evidence that supports your case.',
  },
];

const UploadRow = ({ label }) => (
  <button
    type="button"
    className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-border text-left hover:bg-offset transition-colors cursor-pointer"
  >
    <Icon name="paperclip" size="small" className="text-icon-subdued shrink-0" />
    <span className="text-body-small text-subdued">{label}</span>
  </button>
);

export default function EvidenceSubmission() {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const dispute = getDisputeById(disputeId);
  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!dispute) {
    return <Navigate to={`${basePath}/disputes`} replace />;
  }

  const detailPath = `${basePath}/disputes/${dispute.id}`;

  return (
    <div className="max-w-[720px]">
      <div className="mb-4">
        <Breadcrumb
          pages={[
            { label: 'Disputes', to: `${basePath}/disputes` },
            { label: dispute.id, to: detailPath },
          ]}
          currentPage="Submit evidence"
        />
      </div>

      <div className="mb-6">
        <h1 className="text-heading-xlarge text-default mb-1">Submit evidence</h1>
        <p className="text-body-medium text-subdued">
          {formatCurrency(dispute.amount, dispute.currency)} dispute for {dispute.customerName}
        </p>
      </div>

      {submitted ? (
        <div className="border border-border rounded-lg p-8 text-center">
          <Icon name="checkCircleFilled" size="large" className="text-icon-brand mx-auto mb-3" />
          <h2 className="text-heading-small text-default mb-1">Evidence submitted</h2>
          <p className="text-body-small text-subdued mb-4">
            We'll notify you once the card network reviews your case.
          </p>
          <Button variant="secondary" onClick={() => navigate(detailPath)}>
            Back to dispute
          </Button>
        </div>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          {FIELDS.map((field) => (
            <div key={field.key} className="border border-border rounded-lg p-5 space-y-3">
              <Textarea
                label={field.label}
                description={field.description}
                rows={3}
                placeholder="Enter details..."
                value={values[field.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
              <UploadRow label="Attach a file" />
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary">
              Submit evidence
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(detailPath)}>
              Save draft
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
