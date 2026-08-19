import { useState, useEffect, useRef } from 'react';

export default function DocsTOC({ items = [] }) {
  const [activeId, setActiveId] = useState('');
  const scrollContainerRef = useRef(null);
  const ignoreObserverUntil = useRef(0);

  const getScrollContainer = () => {
    if (scrollContainerRef.current) return scrollContainerRef.current;
    const el = document.querySelector('main.overflow-y-auto') || document.scrollingElement;
    scrollContainerRef.current = el;
    return el;
  };

  const scrollToItem = (event, id) => {
    event.preventDefault();

    const el = document.getElementById(id);
    const container = getScrollContainer();
    if (!el || !container) return;

    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const top = container.scrollTop + (elRect.top - containerRect.top) - 20;
    setActiveId(id);
    ignoreObserverUntil.current = Date.now() + 150;
    window.history.replaceState(null, '', `#${id}`);
    container.scrollTo({ top, behavior: 'instant' });
  };

  useEffect(() => {
    if (items.length === 0) return;

    const container = getScrollContainer();

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < ignoreObserverUntil.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { root: container, rootMargin: '-10px 0px -66% 0px', threshold: 0 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <aside className="hidden xl:block w-[230px] shrink-0 self-stretch">
      <div className="sticky top-0 overflow-y-auto w-full">
        <div className="text-[12px] font-semibold text-default uppercase tracking-wider mb-3">
          On this page
        </div>
        <nav className="space-y-0">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => scrollToItem(event, item.id)}
              className={`block py-1 text-label-medium transition-colors ${
                activeId === item.id
                  ? 'text-docs-accent'
                  : 'text-default'
              } ${item.depth === 2 ? 'ml-0' : 'ml-3'}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
