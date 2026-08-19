export const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-chart-8)',
  'var(--color-chart-9)',
];

export class ColorManager {
  #map = new Map();
  #index = 0;

  get(key) {
    if (this.#map.has(key)) return this.#map.get(key);
    const color = CHART_COLORS[this.#index % CHART_COLORS.length];
    this.#map.set(key, color);
    this.#index++;
    return color;
  }

  getByIndex(idx) {
    return CHART_COLORS[idx % CHART_COLORS.length];
  }

  reset() {
    this.#map.clear();
    this.#index = 0;
  }
}

export function mixColor(color, percentage) {
  return `color-mix(in srgb, ${color} ${100 - percentage}%, white)`;
}
