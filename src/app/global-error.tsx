"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown in the root layout itself, where `error.tsx` can't
 * help. It replaces the whole document, so `globals.css` and the font
 * variables aren't available — the few colours it needs are inlined from the
 * design tokens (base / surface / text / hairline / primary).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "4rem 1.5rem",
          textAlign: "center",
          background: "#0A0C10",
          color: "#E4E9F0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 500, margin: 0 }}>
          Something went wrong at our end.
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#7C8899", maxWidth: "24rem" }}>
          The page didn&rsquo;t load. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            fontSize: "1rem",
            color: "#E4E9F0",
            background: "#151A21",
            border: "1px solid #2C3542",
            borderRadius: "0.25rem",
            padding: "0.75rem 1rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
