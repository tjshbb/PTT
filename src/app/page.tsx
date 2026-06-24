export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">DateSpark</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Paint The Town</h1>
        <p className="mt-4 text-lg text-neutral-600">
          Specific, bookable, on-budget date ideas — tailored to your budget, location, and
          preferences. Not “go somewhere nice.”
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-700">
        <p className="font-medium">Scaffold ready.</p>
        <p className="mt-1">
          Try the generation API:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-brand">POST /api/ideas</code>
        </p>
        <p className="mt-2 text-neutral-500">
          Next: wire NextAuth, connect Postgres (pgvector), and add real provider API keys.
        </p>
      </div>
    </main>
  );
}
