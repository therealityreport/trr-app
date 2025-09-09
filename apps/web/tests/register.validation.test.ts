// @ts-nocheck - Test files use different module resolution and mock configurations
import { describe, it, expect } from 'vitest';
import { validatePassword, validateBirthday } from '@/lib/validation/user';

describe('validatePassword', () => {
  it('requires 8+ chars and a number or symbol', () => {
    expect(validatePassword('short')).toMatch(/at least 8/i);
    expect(validatePassword('longpassword')).toMatch(/number or symbol/i);
    expect(validatePassword('longpass1')).toBeNull();
    expect(validatePassword('longpass!')).toBeNull();
  });
});

describe('validateBirthday age', () => {
  it('rejects users under 13', () => {
    const today = new Date();
    const y = today.getUTCFullYear() - 10; // 10 years old
    const m = String(today.getUTCMonth() + 1).padStart(2, '0');
    const d = String(today.getUTCDate()).padStart(2, '0');
    expect(validateBirthday(`${y}-${m}-${d}`)).toMatch(/at least 13/i);
  });
});

