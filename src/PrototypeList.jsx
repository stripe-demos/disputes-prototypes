import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './icons/SailIcons';
import { Button, Dialog, Input, Radio, Textarea } from './sail';

const STATUS_LABELS = {
  idea: 'Idea',
  in_review: 'In review',
  shipped: 'Shipped',
};

const STATUS_STYLES = {
  idea: 'bg-neutral-100 text-neutral-500',
  in_review: 'bg-badge-warning-bg text-badge-warning-text border border-badge-warning-border',
  shipped: 'bg-badge-success-bg text-badge-success-text border border-badge-success-border',
};

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-small-emphasized ${STATUS_STYLES[status] || STATUS_STYLES.idea}`}>
      {STATUS_LABELS[status] || STATUS_LABELS.idea}
    </span>
  );
}

function PrototypeThumbnail({ image, name }) {
  if (image) {
    return (
      <div className="w-full aspect-[16/10] rounded-t-lg overflow-hidden border-b border-border bg-offset">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-full aspect-[16/10] rounded-t-lg border-b border-border bg-offset flex items-center justify-center">
      <span className="text-label-small text-subdued">No preview</span>
    </div>
  );
}

function EditDialog({ open, onClose, prototype, prototypesCount }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idea');
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const canDelete = prototype && !prototype.isDefault && prototypesCount > 1;
  const nameError = error === 'Name is required' ? error : '';

  useEffect(() => {
    if (open && prototype) {
      setName(prototype.name || '');
      setDescription(prototype.description || '');
      setStatus(prototype.status || 'idea');
      setError('');
      setConfirmingDelete(false);
    }
  }, [open, prototype]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/__api/prototypes/${prototype.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update prototype');
        return;
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/__api/prototypes/${prototype.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete prototype');
        return;
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={confirmingDelete ? `Delete ${prototype?.id || 'prototype'}` : `Edit ${prototype?.id || 'prototype'}`}
      size="medium"
      footer={
        confirmingDelete ? (
          <>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={loading}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Confirm delete'}
            </Button>
          </>
        ) : (
          <>
            {canDelete && (
              <button variant="danger" onClick={() => setConfirmingDelete(true)} className="mr-auto text-danger hover:text-danger-hover text-body-small-emphasized cursor-pointer">
                Delete prototype
              </button>
            )}
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </>
        )
      }
    >
      {confirmingDelete ? (
        <div className="space-y-2 pt-2">
          <p className="text-body-small text-subdued">
            This will permanently delete <span className="text-body-small-emphasized text-default">{prototype?.name}</span> ({prototype?.id}) and all its files.
          </p>
          <p className="text-body-small text-subdued">
            This action cannot be undone.
          </p>
          {error && (
            <p className="text-label-small text-critical">{error}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          <Input
            label="Name"
            value={name}
            onChange={(e) => { setName(e.target.value); if (nameError) setError(''); }}
            placeholder="Prototype name"
            error={!!nameError}
            errorMessage={nameError}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this prototype for?"
            rows={2}
          />
          <div>
            <label className="block text-label-medium-emphasized text-default mb-2">Status</label>
            <div className="flex flex-col gap-2">
              <Radio
                name="status"
                value="idea"
                checked={status === 'idea'}
                onChange={() => setStatus('idea')}
                label="Idea"
              />
              <Radio
                name="status"
                value="in_review"
                checked={status === 'in_review'}
                onChange={() => setStatus('in_review')}
                label="In review"
              />
              <Radio
                name="status"
                value="shipped"
                checked={status === 'shipped'}
                onChange={() => setStatus('shipped')}
                label="Shipped"
              />
            </div>
          </div>
          {error && !nameError && (
            <p className="text-label-small text-critical">{error}</p>
          )}
        </div>
      )}
    </Dialog>
  );
}

export default function PrototypeList({ prototypes }) {
  const navigate = useNavigate();
  const [editTarget, setEditTarget] = useState(null);

  const isDev = import.meta.env.DEV;

  // The base template represents the underlying shipped product, not a
  // prototype to review — it never shows up in the grid. Individual
  // prototypes can also be hidden while they're not ready to be shared.
  const visiblePrototypes = prototypes.filter((p) => !p.isDefault && !p.hidden);

  return (
    <div className="min-h-screen bg-gradient-to-bl from-neutral-100 to-brand-0 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-heading-xlarge text-default">All prototypes</h1>
        </div>
        {visiblePrototypes.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg py-16 px-8 flex flex-col items-center justify-center mb-6">
            <p className="text-body-medium-emphasized text-default">No prototypes yet</p>
            <p className="text-body-small text-subdued mt-1">Prototypes will show up here once they're ready to share.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {visiblePrototypes.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/${p.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/${p.id}`); }}
              className="relative bg-surface border border-border rounded-lg overflow-hidden text-left hover:border-neutral-200 transition-colors duration-100 cursor-pointer"
            >
              {isDev && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditTarget(p);
                  }}
                  variant="secondary"
                  className="absolute top-3 right-3 z-10"
                  aria-label={`Edit ${p.name}`}
                >
                  <Icon name="edit" size="xsmall" fill="currentColor" />
                </Button>
              )}
              <PrototypeThumbnail image={p.image} name={p.name} />
              <div className="p-4">
                <p className="text-body-medium-emphasized text-default mb-1">{p.name}</p>
                <p className="text-body-small text-subdued">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {isDev && (
        <EditDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          prototype={editTarget}
          prototypesCount={prototypes.length}
        />
      )}
    </div>
  );
}
