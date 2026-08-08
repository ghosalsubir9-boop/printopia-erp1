/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared money helpers using integer paise to avoid binary floating-point issues.
 */

export function toPaise(amount: number): number {
  return Math.round(amount * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

export function addMoney(a: number, b: number): number {
  return fromPaise(toPaise(a) + toPaise(b));
}

export function subtractMoney(a: number, b: number): number {
  return fromPaise(toPaise(a) - toPaise(b));
}

export function compareMoney(a: number, b: number): number {
  const pa = toPaise(a);
  const pb = toPaise(b);
  if (pa > pb) return 1;
  if (pa < pb) return -1;
  return 0;
}
