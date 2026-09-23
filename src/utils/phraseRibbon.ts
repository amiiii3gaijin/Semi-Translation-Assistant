import { SELECTION_LIFT, SELECTION_SCALE } from '../design/motion';
import { getRibbonParameters, RibbonParameters } from '../design/ribbonParameters';

export interface RibbonSurface {
  left: number; top: number; width: number; height: number; opacity: number; scaleX: number;
}
export interface RibbonLine { x: number; y: number; width: number; height: number }

export function ribbonMetrics(fontSize: number, p = getRibbonParameters()) {
  const thickness = Math.max(p.lineWidth, fontSize * 0.075 * p.lineWidth / 2);
  const baseLift = Math.min(6, Math.max(2.5, fontSize * 0.16));
  const lift = baseLift * p.currentLift / 4;
  // Restore the original floating-line position; clearance is handled locally.
  return { thickness, lift, adjacentLift: baseLift * p.adjacentLift / 4,
    baselineOffset: fontSize * p.baseline / 25 + thickness / 2 };
}

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Small closed-form approximation: no integration, spline solve or external library.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  return sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a));
}

/** Gaussian-smoothed interval: the silhouette is generated directly, not forced
 * into a flat top and short shoulders. Every value uses the live cursor geometry. */
export function phraseRibbonPath(line: RibbonLine, surfaces: RibbonSurface[], fontSize: number,
  p: RibbonParameters = getRibbonParameters(), report?: (target: number, actual: number) => void): string {
  const baseline = line.y + line.height / 2;
  const metrics = ribbonMetrics(fontSize, p);
  const { baselineOffset } = metrics;
  const lift = Math.max(0.000001, metrics.lift, metrics.adjacentLift);
  const rowCenter = baseline - baselineOffset;
  const reach = Math.max(p.verticalReach * 4 / 7.5, fontSize * p.verticalReach / 25);
  const inkBottom = fontSize * 0.56 * SELECTION_SCALE - SELECTION_LIFT;
  const clearance = Math.max(2, fontSize * 0.1);
  const contacts = surfaces.flatMap(s => {
    if (s.width <= 0 || s.height <= 0 || s.opacity <= 0.001) return [];
    const width = s.width * s.scaleX;
    const left = s.left + (s.width - width) / 2;
    const right = left + width;
    const spread = fontSize * p.spread / 25;
    const sigma = Math.max(spread, Math.min(spread * 2, width * p.widthGrowth));
    if (right + 5 * sigma < line.x || left - 5 * sigma > line.x + line.width) return [];
    const vertical = smooth((baseline - s.top + reach) / reach)
      * smooth((s.top + s.height - baseline + reach) / reach);
    if (vertical === 0) return [];
    // Reduce lift only near the enlarged text's own row, preserving the line above.
    const dy = (s.top + s.height / 2 + SELECTION_LIFT - rowCenter) / (fontSize * 0.45);
    const clearanceWeight = Math.exp(-0.5 * dy * dy);
    const desiredLift = metrics.adjacentLift + (metrics.lift - metrics.adjacentLift) * clearanceWeight;
    const allowed = desiredLift > 0 ? Math.max(0, Math.min(1,
      (baselineOffset - line.height / 2 - inkBottom - clearance) / desiredLift)) : 1;
    const targetStrength = vertical * Math.max(0, Math.min(1, s.opacity)) * desiredLift / lift;
    const strength = targetStrength * (1 - clearanceWeight * (1 - allowed) * p.avoidance);
    const denominator = sigma * Math.SQRT2;
    const normalization = Math.max(0.0001, 2 * erf(width / (2 * denominator)));
    return [{ left, right, sigma, denominator, normalization, strength, targetStrength }];
  });
  const n = (x: number) => Number(x.toFixed(3));
  const point = (x: number, y: number) => `${n(x)},${n(y)}`;
  if (!contacts.length || line.width <= 0) {
    report?.(0, 0);
    return `M${point(line.x, baseline)} H${n(line.x + line.width)}`;
  }
  let peakTarget = 0;
  let peakActual = 0;
  const evaluate = (x: number) => {
    let rest = 1;
    let derivative = 0;
    let targetRest = 1;
    for (const c of contacts) {
      const a = (x - c.left) / c.denominator;
      const b = (x - c.right) / c.denominator;
      const raw = (erf(a) - erf(b)) / c.normalization;
      const influence = Math.max(0, Math.min(1, raw)) * c.strength;
      if (report) targetRest *= 1 - Math.max(0, Math.min(1, raw)) * c.targetStrength;
      const slope = raw > 0 && raw < 1
        ? 2 / Math.sqrt(Math.PI) * (Math.exp(-a * a) - Math.exp(-b * b)) / (c.denominator * c.normalization) * c.strength : 0;
      derivative = derivative * (1 - influence) - rest * slope;
      rest *= 1 - influence;
    }
    if (report) {
      peakTarget = Math.max(peakTarget, lift * (1 - targetRest));
      peakActual = Math.max(peakActual, lift * (1 - rest));
    }
    return { y: baseline - lift * (1 - rest), slope: lift * derivative };
  };
  // A broad field needs few drawing segments. Bound work even on very wide rows.
  const steps = Math.min(128, Math.max(1, Math.ceil(line.width / Math.max(6, fontSize * 0.4))));
  const dx = line.width / steps;
  let previous = evaluate(line.x);
  let path = `M${point(line.x, previous.y)}`;
  for (let i = 1; i <= steps; i++) {
    const x = line.x + i * dx;
    const next = evaluate(x);
    path += ` C${point(x - dx + dx / 3, previous.y + previous.slope * dx / 3)} ${point(x - dx / 3, next.y - next.slope * dx / 3)} ${point(x, next.y)}`;
    previous = next;
  }
  report?.(peakTarget, peakActual);
  return path;
}
