import { expect, vi } from "vitest";

type ExpectedConsoleCapture = {
  expectCalled: () => void;
  restore: () => void;
};

type ConsoleMethod = "error" | "info" | "log" | "warn";

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
  const originalConsoleMethod = console[method];
  const matchedCalls: unknown[][] = [];
  const spy = vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
    const text = args.map(formatConsoleArg).join(" ");
    if (pattern.test(text)) {
      matchedCalls.push(args);
      return;
    }
    originalConsoleMethod(...args);
  });

  return {
    expectCalled: () => {
      expect(matchedCalls.length).toBeGreaterThan(0);
      spy.mockRestore();
    },
    restore: () => {
      spy.mockRestore();
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
