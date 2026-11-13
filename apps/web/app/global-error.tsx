"use client";

import "./globals.css";

/** Last-resort boundary when the root layout itself fails. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" data-theme="light">
      <body className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-h1 font-bold">Something went wrong</h1>
          <p className="mt-2 text-muted">Please try again.</p>
          <button type="button" onClick={reset} className="press mt-6 h-11 rounded-md bg-primary px-5 font-semibold text-primary-fg">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
