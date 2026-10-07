/** Text color configs use for destructive actions. */
export const CRITICAL_TEXT = '#C0123C';

/** `data-tone` for a `.menu-hover-row`; critical rows get the critical surface on hover and tap. */
export const menuRowTone = (color?: string) => (color?.toUpperCase() === CRITICAL_TEXT ? 'critical' : undefined);

export interface MenuSection<T> {
  label: string | null;
  items: T[];
}

/** Splits menu items into sections; every item carrying a `group` starts a new labeled section. */
export function groupMenuItems<T extends { group?: string }>(items: T[]): MenuSection<T>[] {
  const sections: MenuSection<T>[] = [];
  for (const item of items) {
    if (item.group !== undefined || sections.length === 0) {
      sections.push({ label: item.group ?? null, items: [item] });
    } else {
      sections[sections.length - 1].items.push(item);
    }
  }
  return sections;
}
