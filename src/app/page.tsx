import MapBackground from "@/components/MapBackground";
import LocationBadge from "@/components/LocationBadge";
import GenerateIdeasPanel from "@/components/GenerateIdeasPanel";

export default function Home() {
  return (
    <>
      <MapBackground />

      <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
        <div className="rounded-2xl bg-white/70 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">PTT</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Paint The Town</h1>
          <p className="mt-4 text-lg text-neutral-700">
            Specific, bookable, on-budget date ideas tailored to your budget, location,
            and preferences. Not generic.
          </p>
          <div className="mt-5">
            <LocationBadge />
          </div>
        </div>

        <GenerateIdeasPanel />
      </main>
    </>
  );
}
