"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: 24, fontFamily: "sans-serif" }}>
          <h1>Something went wrong</h1>
          <p>We could not load this page. Please try again.</p>
          <button type="button" onClick={retry}>Try again</button>
          {/* A full navigation recovers even when the root router/layout failed. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <p><a href="/">Return home</a></p>
        </main>
      </body>
    </html>
  );
}
