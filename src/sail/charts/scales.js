const SVG_MAX = 100;

function d3Ticks(start, stop, count) {
  if (count <= 0 || start === stop) return [start];
  const step = (stop - start) / count;
  const power = Math.floor(Math.log10(step));
  const error = step / Math.pow(10, power);
  const factor = error >= 7.5 ? 10 : error >= 3.5 ? 5 : error >= 1.5 ? 2 : 1;
  const niceStep = factor * Math.pow(10, power);
  const lo = Math.ceil(start / niceStep) * niceStep;
  const hi = Math.floor(stop / niceStep) * niceStep;
  const ticks = [];
  for (let v = lo; v <= hi + niceStep * 0.5; v += niceStep) {
    ticks.push(Math.round(v * 1e12) / 1e12);
  }
  return ticks;
}

export class LinearScale {
  #domain = [0, 1];
  #range = [0, SVG_MAX];
  #nice = false;
  #tickCount = 4;

  domain(d) {
    if (!d) return this.#domain;
    this.#domain = [...d];
    if (this.#nice) this.#applyNice();
    return this;
  }

  range(r) {
    if (!r) return this.#range;
    this.#range = [...r];
    return this;
  }

  nice(b) {
    if (b === undefined) return this.#nice;
    this.#nice = b;
    if (b) this.#applyNice();
    return this;
  }

  #applyNice() {
    const ticks = d3Ticks(this.#domain[0], this.#domain[1], this.#tickCount);
    if (ticks.length >= 2) {
      const step = ticks[1] - ticks[0];
      let lo = ticks[0], hi = ticks[ticks.length - 1];
      if (lo > this.#domain[0]) lo -= step;
      if (hi < this.#domain[1]) hi += step;
      this.#domain = [lo, hi];
    }
  }

  adjust(values) {
    const arr = Array.isArray(values) ? values : [values];
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    this.#domain = [Math.min(this.#domain[0], min), Math.max(this.#domain[1], max)];
    if (this.#nice) this.#applyNice();
    return this;
  }

  plot(value) {
    const [d0, d1] = this.#domain;
    const [r0, r1] = this.#range;
    if (d1 === d0) return (r0 + r1) / 2;
    return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  }

  invert(pixel) {
    const [d0, d1] = this.#domain;
    const [r0, r1] = this.#range;
    if (r1 === r0) return d0;
    return d0 + ((pixel - r0) / (r1 - r0)) * (d1 - d0);
  }

  ticks(count) {
    if (count !== undefined) this.#tickCount = count;
    if (this.#domain[0] === this.#domain[1]) return [this.#domain[0]];
    return d3Ticks(this.#domain[0], this.#domain[1], this.#tickCount);
  }

  clone() {
    const s = new LinearScale();
    s.domain(this.#domain);
    s.range(this.#range);
    s.#tickCount = this.#tickCount;
    s.nice(this.#nice);
    return s;
  }
}

export class TimeScale {
  #inner = new LinearScale();

  domain(d) {
    if (!d) return this.#inner.domain().map(v => new Date(v));
    this.#inner.domain([d[0].getTime(), d[1].getTime()]);
    return this;
  }

  range(r) {
    if (!r) return this.#inner.range();
    this.#inner.range(r);
    return this;
  }

  nice(b) {
    if (b === undefined) return this.#inner.nice();
    this.#inner.nice(b);
    return this;
  }

  plot(value) {
    return this.#inner.plot(value instanceof Date ? value.getTime() : value);
  }

  invert(pixel) {
    return new Date(this.#inner.invert(pixel));
  }

  ticks(count = 5) {
    const numTicks = this.#inner.ticks(count);
    return numTicks.map(t => new Date(t));
  }

  adjust(values) {
    const arr = Array.isArray(values) ? values : [values];
    this.#inner.adjust(arr.map(v => v instanceof Date ? v.getTime() : v));
    return this;
  }

  clone() {
    const s = new TimeScale();
    const d = this.domain();
    s.domain(d);
    s.range(this.range());
    return s;
  }
}

export class BandScale {
  #domain = [];
  #range = [0, SVG_MAX];
  #padding = 0.1;

  domain(d) {
    if (!d) return this.#domain;
    this.#domain = [...d];
    return this;
  }

  range(r) {
    if (!r) return this.#range;
    this.#range = [...r];
    return this;
  }

  padding(p) {
    if (p === undefined) return this.#padding;
    this.#padding = p;
    return this;
  }

  step() {
    const n = this.#domain.length;
    if (n <= 1) return this.#range[1] - this.#range[0];
    return (this.#range[1] - this.#range[0]) / n;
  }

  bandwidth() {
    const n = this.#domain.length;
    if (n === 0) return 0;
    const s = this.step();
    return s * (1 - this.#padding);
  }

  plot(value) {
    const idx = this.#domain.indexOf(value);
    if (idx === -1) return 0;
    const n = this.#domain.length;
    if (n === 0) return 0;
    if (n === 1) return (this.#range[0] + this.#range[1]) / 2;
    const [r0, r1] = this.#range;
    // Inset so bars don't overflow: first center at half-step, last at range - half-step
    const step = (r1 - r0) / n;
    return r0 + step / 2 + step * idx;
  }

  invert(pixel) {
    const n = this.#domain.length;
    if (n === 0) return undefined;
    if (n === 1) return this.#domain[0];
    const [r0, r1] = this.#range;
    const step = (r1 - r0) / n;
    const idx = Math.floor((pixel - r0) / step);
    return this.#domain[Math.max(0, Math.min(idx, n - 1))];
  }

  ticks() {
    return this.#domain;
  }

  clone() {
    const s = new BandScale();
    s.domain(this.#domain);
    s.range(this.#range);
    s.padding(this.#padding);
    return s;
  }
}

export function createScale(data, key) {
  if (!data || data.length === 0) return new LinearScale();
  const sample = data[0][key];
  if (sample instanceof Date) {
    const dates = data.map(d => d[key]).filter(v => v != null);
    const scale = new TimeScale();
    scale.domain([new Date(Math.min(...dates.map(d => d.getTime()))), new Date(Math.max(...dates.map(d => d.getTime())))]);
    return scale;
  }
  if (typeof sample === 'number') {
    const values = data.map(d => d[key]).filter(v => v != null);
    const scale = new LinearScale();
    scale.domain([Math.min(...values), Math.max(...values)]);
    scale.nice(true);
    return scale;
  }
  const categories = [...new Set(data.map(d => d[key]).filter(v => v != null))];
  const scale = new BandScale();
  scale.domain(categories);
  return scale;
}
