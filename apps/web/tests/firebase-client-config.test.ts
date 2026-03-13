import { beforeEach, describe, expect, it, vi } from "vitest";

describe("firebase client config", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS;
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    delete process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  });

  it("trims Firebase public env values before building the client config", async () => {
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = "false\n";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "key-123\n";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "example.firebaseapp.com\n";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "project-123\n";
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "bucket-123\n";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "sender-123\n";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "app-123\n";
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "measurement-123\n";

    const config = await import("@/lib/firebase-client-config");

    expect(config.FIREBASE_USE_EMULATORS).toBe(false);
    expect(config.firebaseClientConfig).toMatchObject({
      apiKey: "key-123",
      authDomain: "example.firebaseapp.com",
      projectId: "project-123",
      storageBucket: "bucket-123",
      messagingSenderId: "sender-123",
      appId: "app-123",
      measurementId: "measurement-123",
    });
    expect(config.getFirebaseClientConfigValidationError()).toBeNull();
  });

  it("strips wrapping quotes and escaped newline noise from Firebase public env values", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = '"key-123\\n"';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = '"example.firebaseapp.com\\n"';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = '"project-123\\n"';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = '"bucket-123\\n"';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '"sender-123\\n"';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '"app-123\\n"';

    const config = await import("@/lib/firebase-client-config");

    expect(config.firebaseClientConfig).toMatchObject({
      apiKey: "key-123",
      authDomain: "example.firebaseapp.com",
      projectId: "project-123",
      storageBucket: "bucket-123",
      messagingSenderId: "sender-123",
      appId: "app-123",
    });
  });

  it("prefers the emulator project id when Firebase emulators are enabled", async () => {
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = "true";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "key-123";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "example.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "project-prod";
    process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID = "demo-trr";
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "bucket-123";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "sender-123";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "app-123";

    const config = await import("@/lib/firebase-client-config");

    expect(config.FIREBASE_USE_EMULATORS).toBe(true);
    expect(config.firebaseClientConfig.projectId).toBe("demo-trr");
    expect(config.getFirebaseClientConfigValidationError()).toBeNull();
  });

  it("reports missing required Firebase public env values with a clear validation error", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "key-123";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "project-123";

    const config = await import("@/lib/firebase-client-config");

    expect(config.getFirebaseClientConfigValidationError()).toBe(
      "Firebase client configuration is incomplete. Missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID. These NEXT_PUBLIC Firebase env vars must be referenced statically so Next.js can inline them into the client bundle.",
    );
    expect(() => config.assertValidFirebaseClientConfig()).toThrowError(
      /NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN/,
    );
  });
});
