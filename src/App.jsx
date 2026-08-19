import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import prototypes from './prototypes/index';
import PrototypeList from './PrototypeList';

export default function App() {
  return (
    <Suspense fallback={null}>
      <Analytics />
      <Routes>
        {prototypes.map((p) => (
          <Route
            key={p.id}
            path={`${p.id}/*`}
            element={<p.component basePath={`/${p.id}`} />}
          />
        ))}
        <Route path="/" element={<PrototypeList prototypes={prototypes} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
