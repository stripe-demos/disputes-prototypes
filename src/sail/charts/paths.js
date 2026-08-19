const SVG_MAX = 100;

export default class PathGenerator {
  #parts = [];

  line(coords) {
    if (coords.length < 2) return this;

    if (coords.length === 2 && coords[0] != null && coords[1] != null) {
      this.circle(coords[0], coords[1], 5);
      return this;
    }

    let started = false;
    for (let i = 0; i < coords.length; i += 2) {
      const x = coords[i];
      const y = coords[i + 1];
      if (y == null) {
        started = false;
        continue;
      }
      if (!started) {
        this.#parts.push(`M ${x} ${SVG_MAX - y}`);
        started = true;
      } else {
        this.#parts.push(`L ${x} ${SVG_MAX - y}`);
      }
    }
    return this;
  }

  area(upperCoords, lowerCoords) {
    if (upperCoords.length < 4) return this;
    let started = false;
    for (let i = 0; i < upperCoords.length; i += 2) {
      const x = upperCoords[i];
      const y = upperCoords[i + 1];
      if (y == null) continue;
      if (!started) {
        this.#parts.push(`M ${x} ${SVG_MAX - y}`);
        started = true;
      } else {
        this.#parts.push(`L ${x} ${SVG_MAX - y}`);
      }
    }
    for (let i = lowerCoords.length - 2; i >= 0; i -= 2) {
      const x = lowerCoords[i];
      const y = lowerCoords[i + 1];
      if (y == null) continue;
      this.#parts.push(`L ${x} ${SVG_MAX - y}`);
    }
    this.#parts.push('Z');
    return this;
  }

  rect(x0, y0, x1, y1) {
    this.#parts.push(
      `M ${x0} ${SVG_MAX - y0} V ${SVG_MAX - y1} H ${x1} V ${SVG_MAX - y0} Z`
    );
    return this;
  }

  circle(x, y, r = 1) {
    this.#parts.push(`M ${x} ${SVG_MAX - y} h 0.0001`);
    return this;
  }

  toPath() {
    return this.#parts.join(' ');
  }

  isEmpty() {
    return this.#parts.length === 0;
  }
}
