function toPascal(str) {
  return str
    .split(/[-_]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

export default function generate(id, name, description) {
  const pascal = toPascal(id);
  const safeName = name.replace(/[`$\\]/g, '\\$&');
  const safeId = id.replace(/[`$\\]/g, '\\$&');
  return {
    'App.jsx': `import { Routes, Route, Navigate } from 'react-router-dom';
import { BasePathContext } from '../../contexts/BasePath';
import Home from './pages/Home';

export default function ${pascal}App({ basePath = '' }) {
  return (
    <BasePathContext.Provider value={basePath}>
      <div className="min-h-screen bg-surface">
        <Routes>
          <Route path="" element={<Home />} />
          <Route path="*" element={<Navigate to={basePath || "/"} replace />} />
        </Routes>
      </div>
    </BasePathContext.Provider>
  );
}
`,
    'pages/Home.jsx': `export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-heading-xlarge text-default mb-2">${safeName}</h1>
      <p className="text-subdued">Edit <code className="text-monospace-small bg-offset px-2 py-1 rounded">src/prototypes/${safeId}/pages/Home.jsx</code> to get started.</p>
    </div>
  );
}
`,
  };
}
