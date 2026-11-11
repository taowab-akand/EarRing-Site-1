"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="admin">
      <h2>Something needs another try.</h2>
      <p>
        Your changes may not have been saved. Check your connection and inputs,
        then try again.
      </p>
      <button onClick={reset}>Try again</button>
      <a href="/">Return to store</a>
    </main>
  );
}
