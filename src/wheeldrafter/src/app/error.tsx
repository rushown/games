"use client";

/** Shown if something unexpected breaks on a page; the rest of the app keeps working. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ maxWidth: 520, margin: "48px auto", textAlign: "center" }}>
      <div className="kicker">Something went wrong</div>
      <h1 className="page-title">The wheel slipped.</h1>
      <p className="lead" style={{ margin: "0 auto 24px" }}>
        Sorry about that. Your saved legends are safe.
      </p>
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
