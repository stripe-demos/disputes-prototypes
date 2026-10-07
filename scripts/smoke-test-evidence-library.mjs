// Headless smoke test for the Disputes "Evidence library" tab content.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createServer } from 'vite';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const errors = [];
const virtualConsole = new VirtualConsole();
for (const kind of ['error', 'warn', 'jsdomError']) {
  virtualConsole.on(kind, (...args) => errors.push(`[${kind}] ${args.map(String).join(' ')}`));
}

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://127.0.0.1/smart-arb/disputes/evidence-library',
  pretendToBeVisual: true,
  virtualConsole,
});
const { window } = dom;

window.Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 40, width: 800, height: 40 });
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
window.cancelAnimationFrame = (id) => clearTimeout(id);

global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
for (const key of [
  'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'PointerEvent', 'KeyboardEvent', 'CustomEvent',
  'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'MutationObserver',
  'getComputedStyle', 'DOMRect', 'SVGElement', 'DocumentFragment',
]) {
  if (window[key]) global[key] = window[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.console = console;

const vite = await createServer({
  root,
  configFile: path.join(root, 'vite.config.js'),
  server: { middlewareMode: 'ssr', hmr: false },
  appType: 'custom',
});

const { MemoryRouter } = await import('react-router-dom');
const { BasePathContext } = await vite.ssrLoadModule('/src/contexts/BasePath.jsx');
const DisputesList = (await vite.ssrLoadModule('/src/prototypes/smart-arb/pages/DisputesList.jsx')).default;

const container = window.document.getElementById('root');
const reactRoot = createRoot(container);
const failures = [];
const text = (el) => (el?.textContent || '').trim();

try {
  await act(async () => {
    reactRoot.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/smart-arb/disputes/evidence-library'] },
        React.createElement(
          BasePathContext.Provider,
          { value: '/smart-arb' },
          React.createElement(DisputesList)
        )
      )
    );
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 300)); });

  const bodyText = window.document.body.textContent;

  const expectedStrings = [
    'Policy documents',
    'Add policy documents that Smart Disputes can automatically use in future responses when relevant.',
    'Recommended',
    'Other',
    'Proof of terms acceptance',
    'Shows where customers accepted your terms during checkout.',
    'Refund or return policy',
    'Your refund and return terms. Most valuable for credit not processed disputes.',
    'Cancellation policy',
    'Your cancellation terms. Most valuable for subscription canceled disputes.',
    'Data connections',
    'Connect an app so Smart Disputes can access relevant data to automate and improve dispute responses.',
    'Customer support',
    'Shipping and delivery',
    'Analytics',
    'Hubspot',
    'Intercom',
    'Zendesk',
    'Zoho',
  ];
  for (const s of expectedStrings) {
    if (!bodyText.includes(s)) failures.push(`Missing expected text: "${s}"`);
  }

  const buttons = [...window.document.querySelectorAll('button')];
  const addButtons = buttons.filter((b) => text(b) === 'Add');
  if (addButtons.length !== 3) failures.push(`Expected 3 "Add" buttons, found ${addButtons.length}`);
  const connectButtons = buttons.filter((b) => text(b) === 'Connect');
  if (connectButtons.length !== 4) failures.push(`Expected 4 "Connect" buttons, found ${connectButtons.length}`);

  const links = [...window.document.querySelectorAll('a')];
  if (!links.some((a) => text(a) === 'Request app')) failures.push('Missing "Request app" link');

  // Opening the "Add proof of terms acceptance" modal, uploading a file, and confirming
  // should update that document row to its "added" state.
  const firstAddButton = addButtons[0];
  await act(async () => { firstAddButton.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 100)); });

  if (!window.document.body.textContent.includes('Add proof of terms acceptance')) {
    failures.push('Missing "Add proof of terms acceptance" modal title');
  }

  const addPolicyButton = [...window.document.querySelectorAll('button')].find((b) => text(b) === 'Add policy');
  if (!addPolicyButton) failures.push('Missing "Add policy" button in modal');
  else if (!addPolicyButton.disabled) failures.push('"Add policy" button should start disabled before a file is chosen');

  const fileInput = window.document.querySelector('input[type="file"]');
  if (!fileInput) failures.push('Missing file input in add-policy modal');
  else {
    const file = new window.File(['dummy'], 'terms-screenshot.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    await act(async () => { fileInput.dispatchEvent(new window.Event('change', { bubbles: true })); });

    if (addPolicyButton.disabled) failures.push('"Add policy" button should enable once a file is chosen');
    await act(async () => { addPolicyButton.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });

    if (!window.document.body.textContent.includes('Added ')) {
      failures.push('Missing "Added {date}" text after confirming the add-policy modal');
    }
    const editButtons = [...window.document.querySelectorAll('button')].filter((b) => text(b) === 'Edit');
    if (editButtons.length !== 1) failures.push(`Expected 1 "Edit" button after adding a document, found ${editButtons.length}`);
  }

  // Toggling the "Other" / category toggle items should not throw.
  const otherToggle = [...window.document.querySelectorAll('button')].find((b) => text(b) === 'Other');
  if (!otherToggle) failures.push('Missing "Other" toggle item');
  else {
    await act(async () => { otherToggle.click(); });
    if (!window.document.body.textContent.includes('No other documents added')) {
      failures.push('Missing "No other documents added" empty state after clicking "Other"');
    }
    if (window.document.body.textContent.includes('Proof of terms acceptance')) {
      failures.push('Policy documents still shown after switching to "Other" category');
    }
  }

  const analyticsToggle = [...window.document.querySelectorAll('button')].find((b) => text(b) === 'Analytics');
  if (!analyticsToggle) failures.push('Missing "Analytics" toggle item');
  else await act(async () => { analyticsToggle.click(); });

  if (!window.document.body.textContent.includes('Mixpanel')) failures.push('Missing "Mixpanel" app in Analytics category');

  console.log('Collected console/runtime warnings or errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  if (failures.length) {
    console.error('\nSMOKE TEST FAILURES:\n' + failures.map((f) => ' - ' + f).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('\nSMOKE TEST PASSED: evidence library tab renders Policy documents and Data connections content.');
  }
} catch (err) {
  console.error('SMOKE TEST ERROR:', err);
  console.log('Body HTML at failure:\n', window.document.body.innerHTML.slice(0, 4000));
  process.exitCode = 1;
} finally {
  await act(async () => { reactRoot.unmount(); });
  await vite.close();
  window.close();
}
