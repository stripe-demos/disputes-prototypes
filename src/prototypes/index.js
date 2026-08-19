import { lazy } from 'react';
import config from './config.json';

const modules = import.meta.glob('./*/App.jsx');

const prototypes = Object.entries(modules).map(([path, importFn]) => {
  const id = path.split('/')[1];
  const meta = config[id] || {};
  return {
    id,
    name: meta.name || id,
    description: meta.description || '',
    status: meta.status || 'active',
    isDefault: meta.default === true,
    component: lazy(importFn),
  };
});

// Sort so the default prototype comes first
prototypes.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

export default prototypes;
