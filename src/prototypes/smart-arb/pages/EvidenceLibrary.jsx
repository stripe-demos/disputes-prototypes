import { useRef, useState } from 'react';
import { Button, Dialog, Link, SegmentedControl } from '../../../sail';
import { Icon } from '../../../icons/SailIcons';

function AddPolicyDocumentModal({ doc, open, onClose, onAdd }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState(null);

  const handleClose = () => {
    setFileName(null);
    onClose();
  };

  if (!doc) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            disabled={!fileName}
            onClick={() => {
              onAdd(doc);
              setFileName(null);
            }}
          >
            Add policy
          </Button>
        </>
      }
    >
      <div className="pt-4 pb-3 pr-8">
        <h2 className="text-heading-medium text-default">Add {doc.title.toLowerCase()}</h2>
        <p className="text-body-small text-subdued mt-0.5">{doc.description}</p>
      </div>

      <div className="pb-2">
        <p className="text-body-small text-subdued mb-1">Make sure the file:</p>
        <ul className="list-disc pl-5">
          <li className="text-body-small text-subdued">Is legible and complete</li>
          <li className="text-body-small text-subdued">Clearly shows your policy terms</li>
        </ul>
      </div>

      <div className="pt-2">
        <p className="text-label-medium-emphasized text-default">Upload a file</p>
        <p className="text-label-small text-subdued mb-2">PDF, JPEG, and PNG supported. Max 10MB.</p>
        <div className="flex flex-col items-center justify-center gap-3 rounded bg-offset border border-dashed border-border py-4">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>Upload file</Button>
            <span className="text-label-small text-subdued">
              {fileName || 'or drag and drop it here'}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
          />
        </div>
      </div>
    </Dialog>
  );
}

const POLICY_DOCUMENTS = [
  {
    title: 'Proof of terms acceptance',
    description: 'Shows where customers accepted your terms during checkout.',
  },
  {
    title: 'Refund or return policy',
    description: 'Your refund and return terms. Most valuable for credit not processed disputes.',
  },
  {
    title: 'Cancellation policy',
    description: 'Your cancellation terms. Most valuable for subscription canceled disputes.',
  },
];

const APP_CONNECTIONS = [
  { name: 'Hubspot', category: 'Customer support', iconBg: 'bg-[#FF7A59]' },
  { name: 'Intercom', category: 'Customer support', iconBg: 'bg-[#000000]' },
  { name: 'Zendesk', category: 'Customer support', iconBg: 'bg-[#03363D]' },
  { name: 'Zoho', category: 'Customer support', iconBg: 'bg-neutral-100' },
  { name: 'Shippo', category: 'Shipping and delivery', iconBg: 'bg-[#5A31F4]' },
  { name: 'Ship Station', category: 'Shipping and delivery', iconBg: 'bg-[#1E88E5]' },
  { name: 'PostHog', category: 'Analytics', iconBg: 'bg-[#F54E00]' },
  { name: 'Mixpanel', category: 'Analytics', iconBg: 'bg-[#7856FF]' },
];

const DOCUMENT_CATEGORIES = ['Recommended', 'Other'];
const APP_CATEGORIES = ['Customer support', 'Shipping and delivery', 'Analytics'];

function formatAddedDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EvidenceLibrary() {
  const [documentCategory, setDocumentCategory] = useState('Recommended');
  const [appCategory, setAppCategory] = useState('Customer support');
  const [modalDoc, setModalDoc] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addedDocs, setAddedDocs] = useState({});

  const handleAddDoc = (doc) => {
    setAddedDocs((prev) => ({ ...prev, [doc.title]: formatAddedDate(new Date()) }));
    setModalOpen(false);
  };

  return (
    <div className="px-[2px] pt-2 pb-10 max-w-[1040px]">
      <section>
        <h2 className="text-heading-medium text-default">Policy documents</h2>
        <p className="text-body-small text-subdued mt-0.5">
          Add policy documents that Smart Disputes can automatically use in future responses when relevant.
        </p>

        <div className="mt-4">
          <SegmentedControl
            options={DOCUMENT_CATEGORIES.map((category) => ({ label: category, value: category }))}
            value={documentCategory}
            onChange={setDocumentCategory}
          />
        </div>

        <div className="mt-4 bg-offset rounded-[8px] p-2">
          {documentCategory === 'Other' ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[8px] bg-surface px-4 py-10">
              <p className="text-body-small text-subdued">No other documents added</p>
              <Button variant="primary" size="md">Add</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {POLICY_DOCUMENTS.map((doc) => {
                const addedDate = addedDocs[doc.title];
                return (
                <div key={doc.title} className="flex items-center gap-3 rounded-[8px] bg-surface px-4 py-4">
                  <div className={`flex items-center justify-center size-9 rounded-md shrink-0 ${addedDate ? 'bg-success/25' : 'bg-offset'}`}>
                    <Icon name={addedDate ? 'checkCircleFilled' : 'document'} size="small" className={addedDate ? 'text-icon-success' : 'text-icon-subdued'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-medium-emphasized text-default">{doc.title}</h3>
                    <p className="text-body-small text-subdued mt-0.5">{doc.description}</p>
                  </div>
                  {addedDate && (
                    <span className="text-body-small text-subdued shrink-0">Added {addedDate}</span>
                  )}
                  <Button
                    variant={addedDate ? 'secondary' : 'primary'}
                    size="md"
                    className="shrink-0"
                    onClick={() => { setModalDoc(doc); setModalOpen(true); }}
                  >
                    {addedDate ? 'Edit' : 'Add'}
                  </Button>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-heading-medium text-default">Data connections</h2>
        <p className="text-body-small text-subdued mt-0.5">
          Connect an app so Smart Disputes can access relevant data to automate and improve dispute responses.
        </p>

        <div className="flex items-center justify-between gap-2 mt-4">
          <SegmentedControl
            options={APP_CATEGORIES.map((category) => ({ label: category, value: category }))}
            value={appCategory}
            onChange={setAppCategory}
          />
          <Link href="#" className="text-body-small">Request app</Link>
        </div>

        <div className="mt-4 bg-offset rounded-[8px] p-2">
          <div className="grid grid-cols-2 gap-2">
            {APP_CONNECTIONS.filter((app) => app.category === appCategory).map((app) => (
              <div key={app.name} className="flex items-center gap-3 rounded-[8px] bg-surface px-4 py-4">
                <div className={`flex items-center justify-center size-9 rounded-md shrink-0 ${app.iconBg}`}>
                  <Icon name="apps" size="small" className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-medium-emphasized text-default">{app.name}</h3>
                  <p className="text-body-small text-subdued mt-0.5">
                    The marketplace description of the app that can be two lines or more
                  </p>
                </div>
                <Button variant="secondary" size="md" className="shrink-0">Connect</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AddPolicyDocumentModal
        doc={modalDoc}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddDoc}
      />
    </div>
  );
}
