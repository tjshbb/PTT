"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DateIdea } from "@/lib/types";

interface IdeaCarouselProps {
  ideas: DateIdea[];
  onClose?: () => void;
}

export default function IdeaCarousel({ ideas, onClose }: IdeaCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || ideas.length === 0) return null;

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 320;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const atEnd = track.scrollLeft >= maxScroll - 4;
    const atStart = track.scrollLeft <= 4;
    let target: number;
    if (direction === 1) {
      target = atEnd ? 0 : track.scrollLeft + step;
    } else {
      target = atStart ? maxScroll : track.scrollLeft - step;
    }
    track.scrollTo({ left: target, behavior: "smooth" });
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-6">
      <div className="pointer-events-auto w-full max-w-5xl">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-white drop-shadow-md">
            {ideas.length} date {ideas.length === 1 ? "idea" : "ideas"}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous" onClick={() => scrollByCard(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md transition hover:bg-white">‹</button>
            <button type="button" aria-label="Next" onClick={() => scrollByCard(1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md transition hover:bg-white">›</button>
            {onClose && (
              <button type="button" aria-label="Dismiss" onClick={onClose} className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md transition hover:bg-white">✕</button>
            )}
          </div>
        </div>

        <div ref={trackRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ideas.map((idea, i) => (
            <CarouselCard key={`${idea.title}-${i}`} idea={idea} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CarouselCard({ idea }: { idea: DateIdea }) {
  const venue = idea.venues[0];
  const booking = idea.bookingActions[0];
  const bookingUrl = booking?.url ?? undefined;
  const mapUrl = venue?.mapUrl;

  return (
    <article className="flex min-w-[280px] max-w-[300px] shrink-0 snap-center flex-col rounded-2xl bg-white/90 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight text-neutral-900">{idea.title}</h3>
        <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs uppercase tracking-wide text-brand">{idea.tier.toLowerCase()}</span>
      </div>
      <p className="mt-1 line-clamp-3 text-sm text-neutral-600">{idea.pitch}</p>
      <p className="mt-2 text-sm text-neutral-700">
        {formatCents(idea.estCostCents)}
        {idea.isStretch && <span className="ml-1 text-amber-600">· stretch</span>}
        {idea.travelMinutes != null && <span className="text-neutral-500"> · {idea.travelMinutes} min away</span>}
      </p>
      <div className="mt-3 flex items-center gap-3 pt-1">
        {bookingUrl ? (
          <a href={bookingUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90">{booking?.kind === "ticket" ? "Get tickets" : "Book"}</a>
        ) : booking?.handoff ? (
          <span className="text-xs text-neutral-500" title={booking.handoff}>Reserve via {booking.provider}</span>
        ) : null}
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand underline">View on map</a>
        )}
      </div>
    </article>
  );
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
