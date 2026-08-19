import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import generateDashboardShell from './dashboard-shell.js';
import generateEmpty from './empty.js';
import generateStripeDocs from './stripe-docs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypesDir = path.join(__dirname, '..', '..', 'src', 'prototypes');

export const TEMPLATES = [
  {
    id: 'dashboard-shell',
    name: 'Stripe dashboard',
    description: 'Dashboard template with Sail components.',
  },
  {
    id: 'stripe-docs',
    name: 'Stripe Docs',
    description: 'Stripe docs template with Markdoc rendering.',
  },
  {
    id: 'empty',
    name: 'Empty',
    description: 'Empty page.',
  },
];

const generators = {
  'dashboard-shell': generateDashboardShell,
  'empty': generateEmpty,
  'stripe-docs': generateStripeDocs,
};

export function getTemplate(templateId) {
  return generators[templateId] || null;
}

export function getNextId(dir) {
  const protosDir = dir || prototypesDir;
  const existing = fs.readdirSync(protosDir).filter((f) => {
    const full = path.join(protosDir, f);
    return fs.statSync(full).isDirectory() && f !== 'node_modules';
  });
  const maxNum = existing.reduce((max, name) => {
    const match = name.match(/^prototype(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `prototype${maxNum + 1}`;
}
