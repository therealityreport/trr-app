// @ts-nocheck - Test files use different module resolution and mock configurations
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const replace = vi.fn();
const router = { replace };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    onAuthStateChanged: (cb: any) => { cb({ uid: 'u1', email: 'a@example.com', providerData: [], getIdToken: async () => 't' }); return () => {}; },
  },
}));

vi.mock('@/lib/db/users', () => ({
  getUserProfile: vi.fn().mockResolvedValue(null),
  upsertUserProfile: vi.fn().mockResolvedValue(undefined),
  getUserByUsername: vi.fn()
    .mockResolvedValueOnce({ uid: 'u2' }) // first check: taken
    .mockResolvedValue(null), // then available
}));

import FinishPage from '@/app/auth/finish/page';
import { ALL_SHOWS } from '@/lib/data/shows';

describe('/auth/finish interactions', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ shows: [] }),
    } as Response));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enforces min-3 shows and username uniqueness on blur', async () => {
    render(<FinishPage />);
    // wait for page render (username input appears)
    const uname = await screen.findByLabelText(/username/i);
    fireEvent.change(uname, { target: { value: 'taken_user' } });
    fireEvent.blur(uname);
    expect(await screen.findByText(/taken/i)).toBeInTheDocument();

    // select first three shows
    const firstThree = ALL_SHOWS.slice(0, 3);
    for (const s of firstThree) {
      fireEvent.click(screen.getByRole('button', { name: s }));
    }
    // error for shows should disappear when >=3
    for (const s of firstThree) {
      expect(screen.getByRole('button', { name: s })).toHaveAttribute('aria-pressed', 'true');
    }
  });

  it('captures show requests from the request CTA', async () => {
    render(<FinishPage />);
    await screen.findByRole('button', { name: ALL_SHOWS[0] });

    const toggleText = await screen.findByText(/request on here/i);
    fireEvent.click(toggleText.closest('button') as HTMLButtonElement);

    const input = screen.getByPlaceholderText(/type a show name/i);
    fireEvent.change(input, { target: { value: 'The Valley' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(screen.getByLabelText(/remove requested show the valley/i)).toBeInTheDocument();
    const raw = sessionStorage.getItem('finish_show_requests');
    expect(raw).toContain('The Valley');
  });
});
