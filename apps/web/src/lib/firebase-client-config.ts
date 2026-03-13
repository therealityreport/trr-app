const rawFirebaseClientEnv = {
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const;

type FirebaseClientEnvKey = keyof typeof rawFirebaseClientEnv;

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function normalizeEnvValue(value?: string): string {
  const trimmed = (value ?? "").trim();
  const unquoted = stripWrappingQuotes(trimmed).trim();

  return unquoted
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .trim();
}

export function readFirebaseClientEnv(name: FirebaseClientEnvKey): string {
  return normalizeEnvValue(rawFirebaseClientEnv[name]);
}

export function readFirebaseClientBooleanEnv(name: FirebaseClientEnvKey, defaultValue = false): boolean {
  const value = normalizeEnvValue(rawFirebaseClientEnv[name]);
  if (!value) return defaultValue;
  return value.toLowerCase() === "true";
}

export const FIREBASE_USE_EMULATORS = readFirebaseClientBooleanEnv("NEXT_PUBLIC_USE_FIREBASE_EMULATORS", false);

export const firebaseClientConfig = {
  apiKey: readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: FIREBASE_USE_EMULATORS
    ? (readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID") ||
        readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"))
    : readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  measurementId: readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID") || undefined,
};

const REQUIRED_FIREBASE_CLIENT_CONFIG_FIELDS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const satisfies ReadonlyArray<keyof typeof firebaseClientConfig>;

const FIREBASE_CLIENT_CONFIG_ENV_BY_FIELD = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
} as const satisfies Record<(typeof REQUIRED_FIREBASE_CLIENT_CONFIG_FIELDS)[number], FirebaseClientEnvKey>;

export function getFirebaseClientConfigValidationError(): string | null {
  const missingEnvNames = REQUIRED_FIREBASE_CLIENT_CONFIG_FIELDS.flatMap((field) =>
    firebaseClientConfig[field] ? [] : [FIREBASE_CLIENT_CONFIG_ENV_BY_FIELD[field]],
  );

  if (missingEnvNames.length === 0) {
    return null;
  }

  return [
    "Firebase client configuration is incomplete.",
    `Missing ${missingEnvNames.join(", ")}.`,
    "These NEXT_PUBLIC Firebase env vars must be referenced statically so Next.js can inline them into the client bundle.",
  ].join(" ");
}

export function assertValidFirebaseClientConfig(): void {
  const validationError = getFirebaseClientConfigValidationError();

  if (validationError) {
    throw new Error(validationError);
  }
}
