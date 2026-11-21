import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A ref that keeps focus and the pointer out of an element, such as a swipe's
 * preview of a neighboring period. Set directly, as React 18 doesn't know
 * the attribute.
 */
export const makeInert = (el: HTMLElement | null) =>
  el?.setAttribute('inert', '');
