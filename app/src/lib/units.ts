import type { Units } from './types';

const LB_PER_KG = 2.20462;

/** All weights are stored in kg; these convert at the UI boundary. */
export function toDisplay(kg: number, units: Units): number {
  const v = units === 'lb' ? kg * LB_PER_KG : kg;
  return Math.round(v * 10) / 10;
}

export function fromDisplay(value: number, units: Units): number {
  return units === 'lb' ? value / LB_PER_KG : value;
}

export function formatWeight(kg: number, units: Units, withUnit = true): string {
  const v = toDisplay(kg, units);
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return withUnit ? `${s} ${units}` : s;
}

/** Smallest sensible plate jump for progression suggestions. */
export function increment(units: Units): number {
  return units === 'lb' ? 5 : 2.5;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-AU');
}

export function kcalFromMacros(p: number, c: number, f: number): number {
  return Math.round(p * 4 + c * 4 + f * 9);
}
