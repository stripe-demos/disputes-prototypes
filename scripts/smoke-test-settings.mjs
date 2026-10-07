// Headless smoke test for the Disputes settings panel (PaymentsSettings.jsx).
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
  url: 'http://127.0.0.1/smart-arb/settings/payments?tab=disputes',
  pretendToBeVisual: true,
  virtualConsole,
});
const { window } = dom;

window.Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 40, width: 800, height: 40 });
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};

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
window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
window.cancelAnimationFrame = (id) => clearTimeout(id);
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
const PaymentsSettings = (await vite.ssrLoadModule('/src/prototypes/smart-arb/pages/PaymentsSettings.jsx')).default;

const container = window.document.getElementById('root');
const reactRoot = createRoot(container);
const failures = [];

try {
  await act(async () => {
    reactRoot.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/smart-arb/settings/payments?tab=disputes'] },
        React.createElement(
          BasePathContext.Provider,
          { value: '/smart-arb' },
          React.createElement(PaymentsSettings)
        )
      )
    );
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 300)); });

  const bodyText = window.document.body.textContent;

  const expectedStrings = [
    'Preventing disputes',
    'Dispute deflection',
    'Dispute resolution',
    'Responding to disputes',
    'Manage how Stripe responds to disputes and helps you appeal lost disputes.',
    'Automate dispute response',
    "Manual evidence is sent if you've added it by the deadline; otherwise Smart Disputes sends evidence for you.",
    'Respond to appeals',
    'Choose how Stripe responds if an appeal is available for the dispute.',
  ];
  for (const s of expectedStrings) {
    if (!bodyText.includes(s)) failures.push(`Missing expected text: "${s}"`);
  }

  // "Respond to appeals" has no badge until the user saves preferences in its modal, so only 3 of the 4 rows start active.
  const activeBadges = [...window.document.querySelectorAll('span')].filter((s) => s.textContent.trim() === 'Active');
  if (activeBadges.length < 3) failures.push(`Expected at least 3 "Active" badges, found ${activeBadges.length}`);

  const buttons = [...window.document.querySelectorAll('button')];
  const text = (el) => (el?.textContent || '').trim();
  if (!buttons.some((b) => text(b) === 'Set up')) failures.push('Missing "Set up" button for Respond to appeals');
  if (!buttons.some((b) => text(b) === 'Disable')) failures.push('Missing "Disable" button(s)');
  if (!buttons.some((b) => text(b) === 'Edit preferences')) failures.push('Missing "Edit preferences" button for Automate dispute response');

  // Open the "Automate dispute response" modal: both options should start enabled, and
  // the fee links should not render the external-link icon.
  const editPreferencesButton = buttons.find((b) => text(b) === 'Edit preferences');
  await act(async () => { editPreferencesButton.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 100)); });

  const autoRespondModalText = window.document.body.textContent;
  if (!autoRespondModalText.includes('Auto-respond preferences')) failures.push('Missing "Auto-respond preferences" modal title');
  if (!autoRespondModalText.includes('Evidence priority')) failures.push('"Evidence priority" section should be visible when both switches start enabled');

  const feeLinks = [...window.document.querySelectorAll('a')].filter((a) => /fee/i.test(text(a)));
  if (feeLinks.length === 0) failures.push('Missing fee link(s) in auto-respond modal');
  for (const linkEl of feeLinks) {
    if (linkEl.querySelector('svg')) failures.push(`Fee link "${text(linkEl)}" should not render the external-link icon`);
  }

  const autoRespondCancelButton = [...window.document.querySelectorAll('button')].find((b) => text(b) === 'Cancel');
  if (autoRespondCancelButton) await act(async () => { autoRespondCancelButton.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 100)); });

  // Open the "Respond to appeals" modal and verify it matches the Figma appeal-preferences design.
  const setUpButton = buttons.find((b) => text(b) === 'Set up');
  await act(async () => { setUpButton.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 100)); });

  const modalText = window.document.body.textContent;
  const modalExpectedStrings = [
    'Set up appeal preferences',
    'Respond manually',
    'Review each dispute and decide whether to appeal.',
    'Let Smart Disputes appeal for you',
    'View fees',
  ];
  for (const s of modalExpectedStrings) {
    if (!modalText.includes(s)) failures.push(`Missing expected modal text: "${s}"`);
  }

  const switches = [...window.document.querySelectorAll('button[role="switch"], input[type="checkbox"]')];
  if (switches.length < 2) failures.push(`Expected 2 switches in the appeal preferences modal, found ${switches.length}`);
  for (const sw of switches) {
    await act(async () => { sw.click(); });
  }
  await act(async () => { await new Promise((r) => setTimeout(r, 100)); });

  const enableButton = [...window.document.querySelectorAll('button')].find((b) => text(b) === 'Enable');
  if (!enableButton) failures.push('Missing "Enable" button in appeal preferences modal');
  else {
    await act(async () => { enableButton.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    if (!window.document.body.textContent.includes('Appeal preferences saved')) {
      failures.push('Missing "Appeal preferences saved" toast after enabling');
    }
    const activeBadgesAfterSave = [...window.document.querySelectorAll('span')].filter((s) => s.textContent.trim() === 'Active');
    if (activeBadgesAfterSave.length < 4) failures.push(`Expected 4 "Active" badges after saving appeal preferences, found ${activeBadgesAfterSave.length}`);

    // Both switches were turned on, so the row's description on the settings page
    // should reflect that saved choice.
    if (!window.document.body.textContent.includes("You can review and appeal disputes manually. Smart Disputes will review those you don't respond to and automatically appeal eligible disputes.")) {
      failures.push('Respond to appeals description did not update to reflect saved preferences');
    }
    // Once preferences are saved, the row's action button should switch from "Set up" to "Edit preferences".
    const postSaveButtons = [...window.document.querySelectorAll('button')];
    if (postSaveButtons.some((b) => text(b) === 'Set up')) {
      failures.push('"Set up" button should become "Edit preferences" after saving appeal preferences');
    }
    const editPreferencesButtons = postSaveButtons.filter((b) => text(b) === 'Edit preferences');
    if (editPreferencesButtons.length < 2) {
      failures.push(`Expected 2 "Edit preferences" buttons after saving (Automate dispute response + Respond to appeals), found ${editPreferencesButtons.length}`);
    }
  }

  console.log('Collected console/runtime warnings or errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  if (failures.length) {
    console.error('\nSMOKE TEST FAILURES:\n' + failures.map((f) => ' - ' + f).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('\nSMOKE TEST PASSED: settings page matches expected copy, badges, and actions.');
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
