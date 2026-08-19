import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './icons/SailIcons';
import { Button, Dialog, Input, Radio, Textarea, Toggle } from './sail';
import TEMPLATE_IMAGES from './components/TemplateImages';

const STATUS_STYLES = {
  active: 'bg-gradient-to-r from-brand-500 to-brand-700 text-white',
  archived: 'bg-neutral-100 text-neutral-500',
};

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-small-emphasized ${STATUS_STYLES[status] || STATUS_STYLES.archived}`}>
      {status === 'archived' ? 'Archived' : 'Active'}
    </span>
  );
}

function CreateDialog({ open, onClose }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('dashboard-shell');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetch('/__api/templates')
        .then((r) => r.json())
        .then(setTemplates)
        .catch(() => {});
    }
  }, [open]);

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedTemplate('dashboard-shell');
    setError('');
    onClose();
  };

  const nameError = error === 'Name is required' ? error : '';

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/__api/prototypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), template: selectedTemplate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create prototype');
        return;
      }
      handleClose();
      // The server triggers a full-reload via WebSocket after creating files.
      // Use window.location so the browser does a full navigation after reload.
      setTimeout(() => { window.location.href = `/${data.id}`; }, 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Create prototype"
      size="large"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-label-medium-emphasized text-default mb-2">Template</label>
          <div className="grid grid-cols-3 gap-3">
            {templates.map((t) => (
              <Toggle
                key={t.id}
                image={TEMPLATE_IMAGES[t.id]}
                title={t.name}
                description={t.description}
                selected={selectedTemplate === t.id}
                onClick={() => setSelectedTemplate(t.id)}
              />
            ))}
          </div>
        </div>
        <Input
          label="Name"
          value={name}
          onChange={(e) => { setName(e.target.value); if (nameError) setError(''); }}
          placeholder="My Prototype"
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
        {error && !nameError && (
          <p className="text-label-small text-critical">{error}</p>
        )}
      </div>
    </Dialog>
  );
}

function EditDialog({ open, onClose, prototype, prototypesCount }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const canDelete = prototype && !prototype.isDefault && prototypesCount > 1;
  const nameError = error === 'Name is required' ? error : '';

  useEffect(() => {
    if (open && prototype) {
      setName(prototype.name || '');
      setDescription(prototype.description || '');
      setStatus(prototype.status || 'active');
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
                value="active"
                checked={status === 'active'}
                onChange={() => setStatus('active')}
                label="Active"
              />
              <Radio
                name="status"
                value="archived"
                checked={status === 'archived'}
                onChange={() => setStatus('archived')}
                label="Archived"
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
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen bg-gradient-to-bl from-neutral-100 to-brand-0 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-heading-xlarge text-default">All prototypes</h1>
          {isDev && (
            <Button variant="primary" icon="add" onClick={() => setCreateOpen(true)}>
              Create prototype
            </Button>
          )}
        </div>
        <div className="border border-border rounded-lg overflow-hidden mb-6">
          <table className="w-full bg-surface">
            <thead>
              <tr className="border-b border-border bg-offset">
                <th className="py-3 px-4 text-label-small-emphasized text-subdued text-left whitespace-nowrap">STATUS</th>
                <th className="py-3 px-4 text-label-small-emphasized text-subdued text-left">NAME</th>
                <th className="py-3 px-4 text-label-small-emphasized text-subdued text-left">DESCRIPTION</th>
                <th className="py-3 px-4 text-label-small-emphasized text-subdued text-left whitespace-nowrap">ID</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {prototypes.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/${p.id}`)}
                  className="border-b last:border-b-0 border-border hover:bg-offset transition-colors duration-100 cursor-pointer"
                >
                  <td className="py-4 px-4 w-1 whitespace-nowrap">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="py-4 px-4 text-body-small-emphasized text-default w-1 whitespace-nowrap">{p.name}</td>
                  <td className="py-4 px-4 text-body-small text-subdued">{p.description}</td>
                  <td className="py-4 px-4 text-body-small text-subdued w-1 whitespace-nowrap text-monospace-small">{p.id}</td>

                  <td className="py-4 px-4 w-1">
                    <div className="flex items-center gap-1">
                      {isDev && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTarget(p);
                          }}
                          variant="secondary"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Icon name="edit" size="xsmall" fill="currentColor" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isDev && (
        <>
          <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
          <EditDialog
            open={!!editTarget}
            onClose={() => setEditTarget(null)}
            prototype={editTarget}
            prototypesCount={prototypes.length}
          />
        </>
      )}
    </div>
  );
}
