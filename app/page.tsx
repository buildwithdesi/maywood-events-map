import MapShell from "@/components/MapShell";

export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

  if (!apiKey) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center gap-4 px-6 py-12">
        <span className="text-4xl">🌳🗺️</span>
        <h1 className="font-display text-2xl font-bold text-ink">
          Maywood Events Map needs a Google Maps key
        </h1>
        <p className="text-sm leading-relaxed text-ink-soft">
          The app is built and ready. To render the map, add your Google Maps API key
          to a <code className="rounded bg-surface-muted px-1">.env.local</code> file at
          the project root:
        </p>
        <pre className="overflow-x-auto rounded-xl bg-ink px-4 py-3 text-xs text-white">
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_key_here
        </pre>
        <p className="text-sm leading-relaxed text-ink-soft">
          See <code className="rounded bg-surface-muted px-1">README.md</code> for the
          step-by-step Google Cloud setup, including the budget alert and daily quota cap
          so the map can never run up a surprise bill. Then restart{" "}
          <code className="rounded bg-surface-muted px-1">npm run dev</code>.
        </p>
      </main>
    );
  }

  return <MapShell apiKey={apiKey} mapId={mapId} />;
}
