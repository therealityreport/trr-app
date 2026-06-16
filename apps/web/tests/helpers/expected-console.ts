import { expect, vi } from "vitest";

type ExpectedConsoleCapture = {
  expectCalled: () => void;
  restore: () => void;
};

type ConsoleMethod = "error" | "info" | "log" | "warn";

type ConsoleCaptureEntry = {
  matchedCalls: unknown[][];
  pattern: RegExp;
};

type ConsoleSpyState = {
  entries: ConsoleCaptureEntry[];
  spy: ReturnType<typeof vi.spyOn>;
};

const consoleSpyStates = new Map<ConsoleMethod, ConsoleSpyState>();

const formatConsoleArg = (arg: unknown): string => {
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`;
  }
  if (typeof arg === "string") {
    return arg;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
};

const captureExpectedConsole = (method: ConsoleMethod, pattern: RegExp): ExpectedConsoleCapture => {
  let state = consoleSpyStates.get(method);
  if (!state) {
    const originalConsoleMethod = console[method].bind(console);
    const entries: ConsoleCaptureEntry[] = [];
    const spy = vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      const text = args.map(formatConsoleArg).join(" ");
      let matched = false;
      for (const entry of entries) {
        entry.pattern.lastIndex = 0;
        if (entry.pattern.test(text)) {
          entry.matchedCalls.push(args);
          matched = true;
        }
      }
      if (!matched) {
        originalConsoleMethod(...args);
      }
    });
    state = { entries, spy };
    consoleSpyStates.set(method, state);
  }

  const entry: ConsoleCaptureEntry = { matchedCalls: [], pattern };
  state.entries.push(entry);

  const release = () => {
    const current = consoleSpyStates.get(method);
    if (!current) {
      return;
    }
    const index = current.entries.indexOf(entry);
    if (index >= 0) {
      current.entries.splice(index, 1);
    }
    if (current.entries.length === 0) {
      current.spy.mockRestore();
      consoleSpyStates.delete(method);
    }
  };

  return {
    expectCalled: () => {
      expect(entry.matchedCalls.length).toBeGreaterThan(0);
      release();
    },
    restore: () => {
      release();
    },
  };
};

export const captureExpectedConsoleError = (pattern: RegExp): ExpectedConsoleCapture =>
  captureExpectedConsole("error", pattern);

export const captureExpectedConsoleInfo = (pattern: RegExp): ExpectedConsoleCapture =>
  captureExpectedConsole("info", pattern);

export const captureExpectedConsoleLog = (pattern: RegExp): ExpectedConsoleCapture =>
  captureExpectedConsole("log", pattern);

export const captureExpectedConsoleWarn = (pattern: RegExp): ExpectedConsoleCapture =>
  captureExpectedConsole("warn", pattern);
