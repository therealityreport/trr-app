import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import GlobalError from "@/app/global-error";
import ErrorBoundary from "@/components/ErrorBoundary";
import * as Sentry from "@sentry/nextjs";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

it("reports global errors without displaying their details and lets the user retry", () => {
  vi.spyOn(console, "error").mockImplementation(() => {}); // React warns about html/body nesting in the test container.
  const error = new Error("private diagnostic details");
  const retry = vi.fn();
  render(<GlobalError error={error} retry={retry} />);
  expect(Sentry.captureException).toHaveBeenCalledWith(error);
  expect(screen.queryByText(error.message)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
});

it("reports errors caught by the existing application boundary with component context", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const error = new Error("render failed");
  function BrokenChild(): never { throw error; }
  render(<ErrorBoundary><BrokenChild /></ErrorBoundary>);
  expect(screen.getByRole("button", { name: "Refresh Page" })).toBeInTheDocument();
  expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.objectContaining({ contexts: { react: { componentStack: expect.any(String) } } }));
});
