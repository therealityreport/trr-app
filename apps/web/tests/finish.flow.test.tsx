// @ts-nocheck
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => {
  const replace = vi.fn();
  return { useRouter: () => ({ replace }) };
});

vi.mock('@/lib/firebase', () => ({
  auth: {
    onAuthStateChanged: (cb: any) => { cb({ uid: 'u1', email: 'a@example.com', getIdToken: async () => 't' }); return () => {}; },
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
  beforeEach(() => { sessionStorage.clear(); });

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
    const finishBtn = screen.getByRole('button', { name: /finish/i });
    expect(finishBtn).not.toHaveAttribute('disabled');
  });
});

