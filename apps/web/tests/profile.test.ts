// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { parseShows, validateShowsMin, validateUsername } from '@/lib/validation/user';

describe('parseShows + validateShowsMin', () => {
  it('dedupes and trims shows', () => {
    const out = parseShows('A, B, A , C');
    expect(out).toEqual(['A', 'B', 'C']);
  });

  it('requires at least 3 shows', () => {
    expect(validateShowsMin(['A', 'B'], 3)).toBeTruthy();
    expect(validateShowsMin(['A', 'B', 'C'], 3)).toBeNull();
  });
});

describe('validateUsername basic rules', () => {
  it('rejects uppercase and invalid chars', () => {
    expect(validateUsername('ABC')).toBeTruthy();
    expect(validateUsername('ab-')).toBeTruthy();
  });
  it('accepts lowercase, digits and underscore', () => {
    expect(validateUsername('abc_123')).toBeNull();
  });
});

