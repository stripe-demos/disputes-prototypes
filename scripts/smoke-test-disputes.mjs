// Headless smoke test for the cloned m2 Disputes list view.
// No real browser is available in this environment and jsdom does not
// execute <script type="module"> tags, so instead of loading the built
// bundle in a page we use Vite's SSR module loader to run the real
// component tree directly in Node, with jsdom supplying the DOM globals.
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
  url: 'http://127.0.0.1/smart-arb/disputes/activity',
  pretendToBeVisual: true,
  virtualConsole,
});
const { window } = dom;

// jsdom has no layout engine; stub geometry so drag/measure code doesn't throw.
window.Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 40, width: 800, height: 40 });
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 16, width: 100, height: 16 });
window.Range.prototype.getClientRects = () => ([{ x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 16, width: 100, height: 16 }]);
window.HTMLCanvasElement.prototype.getContext = () => ({
  measureText: (s) => ({ width: String(s).length * 7 }),
  font: '',
});
window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
window.cancelAnimationFrame = (id) => clearTimeout(id);

// Install jsdom globals so React/react-dom/framer-motion (which check for a
// browser environment at import time) see a real DOM.
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
        { initialEntries: ['/smart-arb/disputes/activity'] },
        React.createElement(
          BasePathContext.Provider,
          { value: '/smart-arb' },
          React.createElement(DisputesList)
        )
      )
    );
  });
  // let effects / microtasks settle, including the engine's simulated
  // 1000ms initial-load shimmer before real rows replace the skeleton.
  await act(async () => { await new Promise((r) => setTimeout(r, 1400)); });

  window.document.querySelectorAll('style, script').forEach((el) => el.remove());
  const bodyText = window.document.body.textContent;
  if (!bodyText || bodyText.trim().length < 20) {
    failures.push('Rendered body text is empty/near-empty — component likely failed to mount');
  }

  if (!/\$[\d,]+\.\d{2}/.test(bodyText)) failures.push('No formatted currency amounts found in rendered output (real data not rendering)');

  const chipLabels = ['Needs response', 'Arbitration eligible', 'In review', 'Won', 'Lost'];
  for (const label of chipLabels) {
    if (!bodyText.includes(label)) failures.push(`View chip "${label}" not found in rendered output`);
  }
  const buttons = [...window.document.querySelectorAll('button')];
  const chipButtons = buttons.filter((b) => chipLabels.some((l) => text(b).startsWith(l)));
  if (chipButtons.length === 0) failures.push('No view chip buttons found');
  else if (!chipButtons.some((b) => /\d/.test(text(b)))) failures.push('View chip buttons found but none show a numeric count');

  for (const col of ['Amount', 'Status', 'Reason', 'Customer']) {
    if (!bodyText.includes(col)) failures.push(`Column header "${col}" not found`);
  }

  const filterBtn = buttons.find((b) => /filter/i.test(b.getAttribute('aria-label') || '') || /^filter$/i.test(text(b)));
  if (!filterBtn) {
    failures.push('Could not find a Filter button to click');
  } else {
    await act(async () => {
      filterBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
    });
    const afterClickText = window.document.body.textContent;
    const popoverEl = window.document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper], [class*="popover" i], [class*="Popover" i]');
    if (!popoverEl && afterClickText === bodyText) {
      failures.push('Filter popover did not appear to open after clicking the Filter button');
    }
  }

  // 5. Column visibility menu opens from the Table settings trigger.
  const plusTrigger = window.document.querySelector('.table-settings-btn');
  if (!plusTrigger) {
    failures.push('Could not find the Table settings trigger button');
  } else {
    await act(async () => {
      plusTrigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
    });
    const settingsText = window.document.body.textContent;
    if (!settingsText.includes('Table settings')) failures.push('"Table settings" panel did not open after clicking the Table settings trigger');
    // close it again so it doesn't overlay the table for the drag test below
    await act(async () => {
      plusTrigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 100));
    });
  }

  // 6. Column drag-reorder: the real engine has no native `draggable`
  // attribute anywhere — it's implemented via a custom onMouseDown handler
  // on each <th data-col-id>, which starts tracking once the pointer moves
  // >5px, then sets a dragColId state (grabbing cursor + a ghost column).
  // Simulate that exact sequence against a live header cell.
  const headerCell = window.document.querySelector('th[data-col-id="status"]');
  if (!headerCell) {
    failures.push('Could not find a sortable column header cell to drag');
  } else {
    const startX = 300;
    await act(async () => {
      headerCell.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: startX, clientY: 20 }));
    });
    // first move under the 5px threshold must NOT engage dragging yet
    await act(async () => {
      window.document.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: startX + 2, clientY: 20 }));
    });
    if (window.document.body.style.cursor === 'grabbing') {
      failures.push('Column drag engaged before crossing the 5px movement threshold');
    }
    // now move past the 5px threshold — this should register the drag
    await act(async () => {
      window.document.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: startX + 60, clientY: 20 }));
    });
    if (window.document.body.style.cursor !== 'grabbing') {
      failures.push('Column drag did not engage (cursor never switched to "grabbing") after a >5px header mousedown+mousemove');
    }
    const ghostHasLabel = window.document.body.textContent.includes('Status') &&
      window.document.querySelectorAll('th[data-col-id="status"] span').length > 0 &&
      [...window.document.querySelectorAll('span')].some((s) => s.style.opacity === '0' && text(s).startsWith('Status'));
    if (!ghostHasLabel) failures.push('Dragged column header did not become transparent (ghost column swap) during drag');
    await act(async () => {
      window.document.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true, clientX: startX + 60, clientY: 20 }));
    });
    if (window.document.body.style.cursor === 'grabbing') failures.push('Cursor did not reset after mouseup ended the column drag');
  }

  // 7. "Evidence library" tab must be clickable (not disabled) and show a
  // blank page — no table, no "Add your first <thing>" placeholder copy.
  const tabButtons = [...window.document.querySelectorAll('button')];
  const evidenceTabBtn = tabButtons.find((b) => text(b) === 'Evidence library');
  if (!evidenceTabBtn) {
    failures.push('Could not find the "Evidence library" tab button');
  } else {
    if (evidenceTabBtn.getAttribute('aria-disabled') === 'true') {
      failures.push('"Evidence library" tab is disabled — it should be clickable');
    }
    await act(async () => {
      evidenceTabBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
    });
    const afterTabText = window.document.body.textContent;
    if (/Add your first/.test(afterTabText)) failures.push('"Evidence library" tab still shows the default placeholder copy instead of a blank page');
    const visibleTable = [...window.document.querySelectorAll('table')].find((t) => {
      const hiddenAncestor = t.closest('[style*="display: none" i], [style*="display:none" i]');
      return !hiddenAncestor;
    });
    if (visibleTable) failures.push('"Evidence library" tab still shows a visible table instead of a blank page');
    if (window.document.querySelector('.lv-chip-anchor, [data-chip-id]')) {
      failures.push('"Evidence library" tab still shows the view chips bar — it should be hidden');
    }
    const afterTabButtons = [...window.document.querySelectorAll('button')];
    if (afterTabButtons.some((b) => /^filter$/i.test(text(b)) || /filter/i.test(b.getAttribute('aria-label') || ''))) {
      failures.push('"Evidence library" tab still shows the Filter button — it should be hidden');
    }
    if (window.document.querySelector('.table-settings-btn')) {
      failures.push('"Evidence library" tab still shows the Table settings control — it should be hidden');
    }
    if (/results$/m.test(afterTabText) || afterTabButtons.some((b) => b.getAttribute('aria-label') === 'Previous page' || b.getAttribute('aria-label') === 'Next page')) {
      failures.push('"Evidence library" tab still shows pagination controls — it should be hidden');
    }
    if (afterTabButtons.some((b) => {
      const img = b.querySelector('img');
      return img && (img.getAttribute('alt') === 'Analyze' || img.getAttribute('alt') === 'Export');
    })) {
      failures.push('"Evidence library" tab still shows the Analyze/Export header buttons — they should be hidden');
    }
  }

  console.log('Collected console/runtime warnings or errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  if (process.env.DEBUG_DUMP) {
    console.log('--- chip buttons outerHTML ---');
    console.log(chipButtons.map((b) => b.outerHTML));
    console.log('--- row count & table info ---');
    const trs = window.document.querySelectorAll('tbody tr');
    console.log('tbody tr count:', trs.length);
    console.log('table count:', window.document.querySelectorAll('table').length);
    console.log('bodyText length:', bodyText.length);
    console.log('first row outerHTML:', trs[0]?.outerHTML.slice(0, 2000));
    console.log('--- full body text (last 3000 chars) ---');
    console.log(bodyText.slice(-3000));
  }
  if (failures.length) {
    console.error('\nSMOKE TEST FAILURES:\n' + failures.map((f) => ' - ' + f).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('\nSMOKE TEST PASSED: real data, columns, view chip counts, filter popover, table settings, and column drag-reorder all render and respond to interaction.');
  }
} catch (err) {
  console.error('SMOKE TEST ERROR:', err);
  console.log('Collected console/runtime errors so far:', errors);
  console.log('Body HTML at failure:\n', window.document.body.innerHTML.slice(0, 4000));
  process.exitCode = 1;
} finally {
  await act(async () => { reactRoot.unmount(); });
  await vite.close();
  window.close();
}
