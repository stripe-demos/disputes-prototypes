import { Routes, Route, Navigate } from 'react-router-dom';
import { BasePathContext } from '../../contexts/BasePath';
import { DocsLayout, DocsPage, collectRoutes } from '../../docs';
import ControlPanel from './ControlPanel';
import yaml from 'js-yaml';
import sidebarYaml from './content/sidebar.yaml?raw';

const sidebarData = yaml.load(sidebarYaml);
const contentFiles = import.meta.glob('./content/*.md', { eager: true, query: '?raw', import: 'default' });
const { routes: sidebarRoutes, defaultPath } = collectRoutes(sidebarData.sections);

export default function Prototype2App({ basePath = '' }) {
  return (
    <BasePathContext.Provider value={basePath}>
      <ControlPanel />
      <DocsLayout sections={sidebarData.sections} activeTab="Platforms and marketplaces">
        <Routes>
          {sidebarRoutes.map(({ path, content }) => {
            const raw = contentFiles[`./content/${content}`];
            return raw ? <Route key={path} path={path} element={<DocsPage content={raw} />} /> : null;
          })}
          <Route path="*" element={<Navigate to={`${basePath}/${defaultPath || ''}`} replace />} />
        </Routes>
      </DocsLayout>
    </BasePathContext.Provider>
  );
}
