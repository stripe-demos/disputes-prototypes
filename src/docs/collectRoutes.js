/**
 * Walk sidebar sections and collect items with `content` fields into route entries.
 * Returns { routes: [{ path, content }], defaultPath: string|null }.
 */
export default function collectRoutes(sections) {
  const routes = [];
  let defaultPath = null;
  function walk(items) {
    for (const item of items) {
      if (item.content) {
        const path = item.href != null ? item.href : item.content.replace(/\.md$/, '');
        routes.push({ path, content: item.content });
        if (item.default && defaultPath === null) defaultPath = path;
      }
      if (item.children) walk(item.children);
    }
  }
  for (const section of sections) {
    walk(section.items);
  }
  return { routes, defaultPath };
}
