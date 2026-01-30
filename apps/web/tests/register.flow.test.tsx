// @ts-nocheck - Test files use different module resolution and mock configurations
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const push = vi.fn();
const replace = vi.fn();
const router = { replace, push };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock firebase client lib used by the page
vi.mock('@/lib/firebase', () => {
  return {
    auth: {
      onAuthStateChanged: (cb: any) => {
        // start signed-out
        cb(null);
        return () => {};
      },
    },
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock the subset of firebase/auth APIs used by the page
vi.mock('firebase/auth', () => {
  return {
    createUserWithEmailAndPassword: vi.fn().mockResolvedValue({ user: { uid: 'u1', email: 'a@example.com', getIdToken: vi.fn().mockResolvedValue('token') } }),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    OAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
  };
});

// Mock server login API call
global.fetch = vi.fn().mockResolvedValue({ ok: true });

// Mock DB upsert used after signup
vi.mock('@/lib/db/users', () => ({
  upsertUserProfile: vi.fn().mockResolvedValue(undefined),
  getUserProfile: vi.fn().mockResolvedValue(null),
  checkUserExists: vi.fn().mockResolvedValue(false),
}));

import RegisterPage from '@/app/auth/register/page';

describe('/auth/register two-stage flow', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('Stage A -> Stage B hides Google CTA and locks email', async () => {
    render(<RegisterPage />);
    const email = screen.getByLabelText(/email address/i);
    fireEvent.change(email, { target: { value: 'user@example.com' } });
    fireEvent.submit(email.closest('form')!);

    expect(screen.queryByText(/continue with google/i)).toBeNull();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('Edit email routes back to home', async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'user@example.com' } });
    fireEvent.submit(screen.getByLabelText(/email address/i).closest('form')!);

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } });
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(push).toHaveBeenCalledWith('/');
  });

  it('Validates email format on Stage A', () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'bad' } });
    fireEvent.submit(screen.getByLabelText(/email address/i).closest('form')!);
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
  });
});
