import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import FinishProfilePage from "@/app/auth/finish/page";
import CompleteAuthPage from "@/app/auth/complete/page";
import RegisterPage from "@/app/auth/register/page";
import RegisterLayout from "@/app/auth/register/layout";
import LoginPage from "@/app/login/page";
import ProfilePage from "@/app/profile/page";
import ClientAuthGuard from "@/components/ClientAuthGuard";
import { readProfileDraft } from "@/lib/profile-draft";
import { isProfileComplete, type UserProfile } from "@/lib/validation/user";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as User | null, onAuthStateChanged: vi.fn() },
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  checkUsername: vi.fn(),
  checkUserExists: vi.fn(),
  createUser: vi.fn(),
  updateAuthProfile: vi.fn(),
  signIn: vi.fn(),
  router: { replace: vi.fn(), push: vi.fn() },
  redirect: vi.fn(),
  cookie: vi.fn(),
  verifyCookie: vi.fn(),
  serverProfile: vi.fn(),
  search: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.search,
  redirect: mocks.redirect,
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: { verifySessionCookie: mocks.verifyCookie },
  adminDb: { collection: () => ({ doc: () => ({ get: mocks.serverProfile }) }) },
}));
vi.mock("@/lib/firebase", () => ({
  auth: mocks.auth,
  signInWithGoogle: vi.fn(),
}));
vi.mock("firebase/auth", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase/auth")>(),
  createUserWithEmailAndPassword: mocks.createUser,
  signInWithEmailAndPassword: mocks.signIn,
  updateProfile: mocks.updateAuthProfile,
}));
vi.mock("@/lib/db/users", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/db/users")>(),
  getUserProfile: mocks.getProfile,
  upsertUserProfile: mocks.saveProfile,
  isUsernameAvailable: mocks.checkUsername,
  checkUserExists: mocks.checkUserExists,
}));

const SHOWS = ["Saved First Show", "Saved Second Show", "Saved Third Show"];

function user(uid: string): User {
  return { uid, email: `${uid}@example.test`, displayName: `${uid} Fan` } as User;
}

function savedProfile(uid: string, overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid,
    username: `saved_${uid}`,
    name: `Saved ${uid}`,
    birthday: "1990-01-23",
    gender: "Female",
    livesInUS: true,
    state: "New York",
    shows: SHOWS,
    showRequests: ["Saved Show Request"],
    ...overrides,
  } as UserProfile;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

type AuthCallback = (user: User | null) => void;
const subscriptions: AuthCallback[] = [];
const activeSubscriptions = new Set<AuthCallback>();

function changeAccount(account: User | null) {
  act(() => {
    mocks.auth.currentUser = account;
    activeSubscriptions.forEach((callback) => callback(account));
  });
}

beforeEach(() => {
  subscriptions.length = 0;
  activeSubscriptions.clear();
  mocks.auth.currentUser = null;
  mocks.auth.onAuthStateChanged.mockImplementation((callback: AuthCallback) => {
    subscriptions.push(callback);
    activeSubscriptions.add(callback);
    // Firebase emits the restored current user when a listener attaches.
    if (mocks.auth.currentUser) {
      void Promise.resolve().then(() => {
        if (activeSubscriptions.has(callback)) callback(mocks.auth.currentUser);
      });
    }
    return () => activeSubscriptions.delete(callback);
  });
  mocks.getProfile.mockReset().mockResolvedValue(null);
  mocks.saveProfile.mockReset().mockResolvedValue(undefined);
  mocks.checkUsername.mockReset().mockResolvedValue(true);
  mocks.checkUserExists.mockReset().mockResolvedValue(false);
  mocks.createUser.mockReset();
  mocks.updateAuthProfile.mockReset().mockResolvedValue(undefined);
  mocks.signIn.mockReset();
  mocks.redirect.mockReset().mockImplementation((path: string) => { throw new Error(`redirect ${path}`); });
  mocks.cookie.mockReset();
  mocks.verifyCookie.mockReset().mockResolvedValue({ uid: "alpha" });
  mocks.serverProfile.mockReset();
  mocks.search = new URLSearchParams();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    shows: [{ name: "Current Catalog Show" }],
  }))));
});

describe("finish profile", () => {
  it.each(["saved_alpha", "Older.Name"])("omits unchanged username %s after the saved profile loads", async (savedUsername) => {
    const pendingProfile = deferred<UserProfile>();
    mocks.getProfile.mockReturnValue(pendingProfile.promise);
    sessionStorage.setItem("finish_username", "legacy_unscoped");
    render(<FinishProfilePage />);
    changeAccount(user("alpha"));

    expect(screen.getByRole("status")).toHaveTextContent("Loading your profile");
    expect(screen.queryByLabelText("Username")).toBeNull();
    await act(async () => pendingProfile.resolve(savedProfile("alpha", { username: savedUsername, usernameStatus: "conflict" })));
    const username = await screen.findByLabelText("Username");
    expect(username).toHaveValue(savedUsername);
    expect(screen.getByLabelText("Birthday")).toHaveValue("1990-01-23");
    expect(screen.getByLabelText("Gender")).toHaveValue("Female");
    expect(screen.getByLabelText("Country")).toHaveValue("United States");
    expect(screen.getByLabelText("State")).toHaveValue("New York");
    expect(await screen.findByRole("button", { name: SHOWS[0], pressed: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Request on here/ }));
    expect(screen.getByRole("button", { name: "Remove requested show Saved Show Request" })).toBeInTheDocument();
    fireEvent.blur(username);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/hub"));
    expect(mocks.checkUsername).not.toHaveBeenCalled();
    expect(mocks.saveProfile).toHaveBeenCalledWith("alpha", expect.objectContaining({
      state: "New York",
      country: "",
      shows: SHOWS,
      showRequests: ["Saved Show Request"],
    }));
    expect(mocks.saveProfile.mock.calls[0][1]).not.toHaveProperty("username");
    expect(readProfileDraft("alpha")).toBeNull();
  });

  it("ignores an old account read and restores each account's full draft", async () => {
    const oldProfile = deferred<UserProfile>();
    sessionStorage.setItem("finish_username", "legacy_unscoped");
    mocks.getProfile.mockReturnValueOnce(oldProfile.promise)
      .mockResolvedValueOnce(savedProfile("beta", { username: "", livesInUS: false, country: "Canada" }))
      .mockResolvedValueOnce(savedProfile("alpha"))
      .mockResolvedValueOnce(savedProfile("beta"));
    render(<FinishProfilePage />);
    changeAccount(user("alpha"));
    changeAccount(user("beta"));
    const username = await screen.findByLabelText("Username");
    expect(username).toHaveValue("beta_fan");
    await act(async () => oldProfile.resolve(savedProfile("alpha")));
    expect(username).toHaveValue("beta_fan");

    fireEvent.change(username, { target: { value: "beta_draft" } });
    fireEvent.change(screen.getByLabelText("Birthday"), { target: { value: "1995-02-03" } });
    fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Other" } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "United States" } });
    fireEvent.change(screen.getByLabelText("State"), { target: { value: "California" } });
    fireEvent.click(await screen.findByRole("button", { name: "Current Catalog Show" }));
    fireEvent.click(screen.getByRole("button", { name: /Request on here/ }));
    const request = screen.getByPlaceholderText("Type a show name...");
    fireEvent.change(request, { target: { value: "A Draft Show" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(request, { target: { value: "Still typing" } });

    changeAccount(user("alpha"));
    expect(await screen.findByLabelText("Username")).toHaveValue("saved_alpha");
    expect(screen.getByLabelText("State")).toHaveValue("New York");
    expect(readProfileDraft("alpha")).toBeNull();
    changeAccount(user("beta"));

    expect(await screen.findByLabelText("Username")).toHaveValue("beta_draft");
    expect(screen.getByLabelText("Birthday")).toHaveValue("1995-02-03");
    expect(screen.getByLabelText("Gender")).toHaveValue("Other");
    expect(screen.getByLabelText("Country")).toHaveValue("United States");
    expect(screen.getByLabelText("State")).toHaveValue("California");
    expect(await screen.findByRole("button", { name: "Current Catalog Show", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove requested show A Draft Show" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type a show name...")).toHaveValue("Still typing");
  });

  it("keeps input on a write failure and clears the inactive location on retry", async () => {
    mocks.getProfile.mockResolvedValue(savedProfile("alpha"));
    mocks.saveProfile.mockRejectedValueOnce(Object.assign(new Error(), { code: "profile/unavailable" }));
    mocks.checkUsername.mockResolvedValue(false);
    render(<FinishProfilePage />);
    changeAccount(user("alpha"));
    const username = await screen.findByLabelText("Username");
    fireEvent.change(username, { target: { value: "new_alpha" } });
    fireEvent.blur(username);
    expect(await screen.findByText("That username may be taken.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "Canada" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save your profile");
    expect(username).toHaveValue("new_alpha");
    expect(screen.getByLabelText("Country")).toHaveValue("Canada");
    expect(readProfileDraft("alpha")).toMatchObject({ username: "new_alpha", country: "Canada", state: "" });
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(mocks.saveProfile).toHaveBeenCalledWith("alpha", expect.objectContaining({ country: "Canada", state: "", livesInUS: false }));

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/hub"));
    expect(readProfileDraft("alpha")).toBeNull();
  });

  it("never opens a blank editor after a read error and allows a fresh read", async () => {
    mocks.getProfile.mockRejectedValueOnce(Object.assign(new Error(), { code: "profile/unavailable" }))
      .mockResolvedValueOnce(savedProfile("alpha"));
    render(<FinishProfilePage />);
    changeAccount(user("alpha"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load your profile");
    expect(screen.queryByLabelText("Username")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByLabelText("Username")).toHaveValue("saved_alpha");
  });

  it("does not redirect the new account when a former account's save succeeds", async () => {
    const pendingSave = deferred<void>();
    mocks.getProfile.mockResolvedValueOnce(savedProfile("alpha")).mockResolvedValueOnce(savedProfile("beta"));
    mocks.saveProfile.mockReturnValueOnce(pendingSave.promise);
    render(<FinishProfilePage />);
    changeAccount(user("alpha"));
    fireEvent.change(await screen.findByLabelText("Username"), { target: { value: "edited_alpha" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(readProfileDraft("alpha")).toMatchObject({ username: "edited_alpha" });
    changeAccount(user("beta"));
    fireEvent.change(await screen.findByLabelText("Username"), { target: { value: "edited_beta" } });
    await act(async () => pendingSave.resolve(undefined));
    expect(readProfileDraft("alpha")).toBeNull();
    expect(readProfileDraft("beta")).toMatchObject({ username: "edited_beta" });
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
});

describe("auth profile decisions", () => {
  it("requires a username, birthday, and three shows without requiring reservation", () => {
    expect(isProfileComplete(savedProfile("alpha", { usernameStatus: "conflict" }))).toBe(true);
    expect(isProfileComplete(savedProfile("alpha", { username: " " }))).toBe(false);
    expect(isProfileComplete(savedProfile("alpha", { birthday: "" }))).toBe(false);
    expect(isProfileComplete(savedProfile("alpha", { shows: SHOWS.slice(0, 2) }))).toBe(false);
    expect(isProfileComplete(null)).toBe(false);
  });

  it("has one active Strict Mode listener and ignores old profile results", async () => {
    vi.useFakeTimers();
    mocks.search = new URLSearchParams("provider=google");
    const oldProfile = deferred<UserProfile>();
    const newProfile = deferred<UserProfile>();
    mocks.getProfile.mockReturnValueOnce(oldProfile.promise).mockReturnValueOnce(newProfile.promise);
    const view = render(<StrictMode><CompleteAuthPage /></StrictMode>);

    expect(subscriptions).toHaveLength(2);
    expect(activeSubscriptions.size).toBe(1);
    act(() => { subscriptions[0](user("disposed")); });
    expect(mocks.getProfile).not.toHaveBeenCalled();
    changeAccount(null);
    act(() => { vi.advanceTimersByTime(7000); });
    changeAccount(user("alpha"));
    changeAccount(user("beta"));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(mocks.router.replace).not.toHaveBeenCalled();
    await act(async () => oldProfile.resolve(savedProfile("alpha")));
    expect(mocks.router.replace).not.toHaveBeenCalled();

    view.unmount();
    await act(async () => newProfile.resolve(savedProfile("beta")));
    act(() => { vi.runAllTimers(); });
    expect(activeSubscriptions.size).toBe(0);
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it.each([
    { result: "missing birthday", profile: savedProfile("alpha", { birthday: "" }), path: "/auth/finish" },
    { result: "one show", profile: savedProfile("alpha", { shows: SHOWS.slice(0, 1) }), path: "/auth/finish" },
    { result: "complete legacy duplicate", profile: savedProfile("alpha", { usernameStatus: "conflict" }), path: "/hub" },
  ])("routes OAuth completion for $result to $path", async ({ profile, path }) => {
    mocks.getProfile.mockResolvedValue(profile);
    render(<CompleteAuthPage />);
    changeAccount(user("alpha"));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith(path));
  });

  it.each(["profile/unavailable", "permission-denied"])("retries a %s profile read after password sign-in", async (code) => {
    const account = user("alpha");
    mocks.signIn.mockImplementation(async () => {
      mocks.auth.currentUser = account;
      return { user: account };
    });
    mocks.getProfile.mockRejectedValueOnce(Object.assign(new Error(), { name: "FirebaseError", code }))
      .mockResolvedValueOnce(savedProfile("alpha"));
    const login = render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: account.email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in", exact: true }));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/auth/complete?welcome=1"));
    login.unmount();
    mocks.router.replace.mockClear();
    mocks.search = new URLSearchParams("welcome=1");
    render(<CompleteAuthPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load your profile");
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("toastMessage")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/hub"));
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("toastMessage")).toBe("Welcome back!");
  });

  it("does not authorize a new account from a former account's profile", async () => {
    const oldProfile = deferred<UserProfile>();
    mocks.getProfile.mockReturnValueOnce(oldProfile.promise).mockResolvedValueOnce(savedProfile("beta", { birthday: "" }));
    render(<ClientAuthGuard requireComplete><p>Private content</p></ClientAuthGuard>);
    changeAccount(user("alpha"));
    changeAccount(user("beta"));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/auth/finish"));
    await act(async () => oldProfile.resolve(savedProfile("alpha")));
    expect(screen.queryByText("Private content")).toBeNull();
  });

  it("only opens protected content after recovering from a profile read outage", async () => {
    mocks.getProfile.mockRejectedValueOnce(Object.assign(new Error(), { code: "profile/unavailable" }))
      .mockResolvedValueOnce(savedProfile("alpha"));
    render(<ClientAuthGuard requireComplete><p>Private content</p></ClientAuthGuard>);
    changeAccount(user("alpha"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load your profile");
    expect(screen.queryByText("Private content")).toBeNull();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Private content")).toBeInTheDocument();
  });

  it("labels only a reserved username as reserved and ignores a late profile", async () => {
    const oldProfile = deferred<UserProfile>();
    mocks.getProfile.mockReturnValueOnce(oldProfile.promise)
      .mockResolvedValueOnce(savedProfile("beta", { usernameStatus: "conflict" }))
      .mockResolvedValueOnce(savedProfile("gamma", { usernameStatus: "reserved" }));
    render(<ProfilePage />);
    changeAccount(user("alpha"));
    changeAccount(user("beta"));
    expect(await screen.findByText("Username on file")).toBeInTheDocument();
    expect(screen.getByText(/Another account uses this username/)).toBeInTheDocument();
    await act(async () => oldProfile.resolve(savedProfile("alpha", { usernameStatus: "reserved" })));
    expect(screen.queryByText("Saved alpha")).toBeNull();
    expect(screen.queryByText("Username reserved")).toBeNull();
    changeAccount(user("gamma"));
    expect(await screen.findByText("Username reserved")).toBeInTheDocument();
  });

  it("shows a retry when the profile page cannot read profile details", async () => {
    mocks.getProfile.mockRejectedValueOnce(Object.assign(new Error(), { code: "profile/unavailable" }))
      .mockResolvedValueOnce(savedProfile("alpha"));
    render(<ProfilePage />);
    changeAccount(user("alpha"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load your profile");
    expect(screen.queryByText("Username on file")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Saved alpha")).toBeInTheDocument();
  });
});

describe("registration profile decisions", () => {
  it("retries the profile write for the created account and retains the entered fields", async () => {
    mocks.search = new URLSearchParams("email=alpha@example.test");
    const account = user("alpha");
    mocks.createUser.mockImplementation(async () => {
      changeAccount(account);
      return { user: account };
    });
    mocks.saveProfile.mockRejectedValueOnce(Object.assign(new Error(), { code: "profile/unavailable" }));
    render(<RegisterPage />);
    fireEvent.change(await screen.findByLabelText("First Name"), { target: { value: "New" } });
    fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Member" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password1" } });
    fireEvent.change(screen.getByLabelText("Re-enter password"), { target: { value: "test-password1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your account was created. Unable to save your profile.");
    expect(screen.getByLabelText("First Name")).toHaveValue("New");
    expect(screen.getByLabelText("Last Name")).toHaveValue("Member");
    expect(screen.getByLabelText("Password")).toHaveValue("test-password1");
    expect(mocks.getProfile).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry profile save" }));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/auth/finish"));
    expect(mocks.createUser).toHaveBeenCalledExactlyOnceWith(mocks.auth, account.email, "test-password1");
    expect(mocks.saveProfile.mock.calls).toEqual([
      ["alpha", { name: "New Member" }],
      ["alpha", { name: "New Member" }],
    ]);
    expect(sessionStorage.getItem("reg_name")).toBeNull();
  });

  it("retries the signed-in registration check before deciding where to go", async () => {
    mocks.getProfile.mockRejectedValueOnce(new Error("read failed"))
      .mockResolvedValueOnce(savedProfile("alpha", { birthday: "" }));
    render(<RegisterPage />);
    changeAccount(user("alpha"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load your profile");
    expect(mocks.router.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/auth/finish"));
  });

  it.each([
    { label: "complete", profile: savedProfile("alpha", { usernameStatus: "conflict" }) },
    { label: "incomplete", profile: savedProfile("alpha", { birthday: "" }) },
    { label: "malformed", profile: { ...savedProfile("alpha"), shows: [SHOWS[0], false, 3] } },
    { label: "missing", profile: null },
  ])("allows client sign-in recovery with a $label cookie-only profile", async ({ profile }) => {
    mocks.cookie.mockReturnValue({ value: "valid-session-cookie" });
    mocks.serverProfile.mockResolvedValue({ data: () => profile });
    render(RegisterLayout({ children: <RegisterPage /> }));
    changeAccount(null);
    expect(await screen.findByLabelText("Email address")).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(mocks.getProfile).not.toHaveBeenCalled();
  });
});
