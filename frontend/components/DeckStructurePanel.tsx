"use client";

import type { Slide } from "@/lib/mockSlides";
import type { GhostSlidePreview } from "@/lib/ghostDeckFromThread";

const SLIDE_TYPE_LABEL: Record<Slide["type"], string> = {
  title: "Title",
  concept: "Concept",
  comparison: "Compare",
  timeline: "Timeline",
  evidence: "Evidence",
  conclusion: "Close",
};

function slideTypeIcon(type: Slide["type"]) {
  const common = "h-4 w-4 shrink-0 text-zinc-500";
  switch (type) {
    case "title":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      );
    case "comparison":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      );
    case "timeline":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "evidence":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25a2.25 2.25 0 01-2.25 2.25h-2.25m0 0h-7.5m0 0h-.007v.008H12v-.008z" />
        </svg>
      );
    case "conclusion":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "concept":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75.002v-.002z" />
        </svg>
      );
  }
}

export interface DeckStructurePanelProps {
  slides: Slide[];
  ghostSlides: GhostSlidePreview[];
  hasThreadMessages: boolean;
  onOpenSlideIndex?: (index: number) => void;
}

export function DeckStructurePanel({
  slides,
  ghostSlides,
  hasThreadMessages,
  onOpenSlideIndex,
}: DeckStructurePanelProps) {
  const hasGenerated = slides.length > 0;
  const hasGhost = !hasGenerated && ghostSlides.length > 0;

  return (
    <aside
      className="flex h-[min(40vh,14rem)] min-h-0 w-full shrink-0 flex-col border-t border-zinc-800 bg-zinc-900/40 md:h-full md:w-[min(100%,18rem)] md:border-l md:border-t-0 lg:w-72"
      aria-label="Slide deck structure"
    >
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Deck structure</h2>
          {hasGhost && (
            <span className="shrink-0 rounded-md border border-dashed border-zinc-600 bg-zinc-800/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Preview
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-medium text-zinc-200">
          {hasGenerated
            ? `${slides.length} slide${slides.length === 1 ? "" : "s"}`
            : hasGhost
              ? `${ghostSlides.length} draft slide${ghostSlides.length === 1 ? "" : "s"} from chat`
              : "Not generated yet"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!hasGenerated && !hasGhost && (
          <div className="rounded-lg border border-dashed border-zinc-700/80 bg-zinc-950/50 px-3 py-4">
            <div className="flex gap-2 text-zinc-400">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <p className="text-xs leading-relaxed text-zinc-400">
                {hasThreadMessages
                  ? "Paste a numbered outline or ask for a proposed slide list — a ghost deck will appear here from bullets and headings in the thread."
                  : "Describe your deck or paste an outline. We infer a preview from lists and headings in the chat before you generate."}
              </p>
            </div>
          </div>
        )}

        {hasGhost && (
          <>
            <ol className="flex list-none flex-col gap-1 p-0">
              {ghostSlides.map((slide, index) => (
                <li key={slide.id}>
                  <div className="flex items-start gap-2 rounded-lg border border-dashed border-zinc-700/70 bg-zinc-950/30 px-2 py-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-zinc-600 bg-zinc-900/80 text-[11px] font-semibold tabular-nums text-zinc-500">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-zinc-300">{slide.title}</span>
                      <span className="mt-1 flex items-center gap-1.5 opacity-80">
                        {slideTypeIcon(slide.type)}
                        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          {SLIDE_TYPE_LABEL[slide.type]} (inferred)
                        </span>
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t border-zinc-800/80 pt-3 text-[11px] leading-relaxed text-zinc-500">
              Final titles, order, and slide types are set when you generate. This is only a live read of outlines in your
              messages.
            </p>
          </>
        )}

        {hasGenerated && (
          <ol className="flex list-none flex-col gap-1 p-0">
            {slides.map((slide, index) => {
              const interactive = Boolean(onOpenSlideIndex);
              return (
                <li key={slide.id}>
                  <button
                    type="button"
                    disabled={!interactive}
                    onClick={() => onOpenSlideIndex?.(index)}
                    className={
                      interactive
                        ? "flex w-full cursor-pointer items-start gap-2 rounded-lg border border-transparent px-2 py-2 text-left transition-colors duration-200 motion-reduce:transition-none hover:border-zinc-700 hover:bg-zinc-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                        : "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left"
                    }
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[11px] font-semibold tabular-nums text-zinc-300">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-zinc-100">{slide.title}</span>
                      <span className="mt-1 flex items-center gap-1.5">
                        {slideTypeIcon(slide.type)}
                        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          {SLIDE_TYPE_LABEL[slide.type]}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
