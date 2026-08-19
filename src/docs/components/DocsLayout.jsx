import DocsHeader from './DocsHeader';
import DocsSidebar from './DocsSidebar';

export default function DocsLayout({ sections = [], activeTab, children }) {
  return (
    <div className="h-screen flex flex-col bg-white">
      <DocsHeader activeTab={activeTab} />

      <div className="flex-1 flex overflow-hidden">
        <DocsSidebar sections={sections} />
        <main className="flex-1 overflow-y-auto">
          <div className="min-w-0 max-w-[1175px] mx-auto px-10 pt-10 pb-16">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
