"use client";

import { AssistantRuntimeProvider, useThreadRuntime } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Chat } from "@/components/chat";
import { useState, useCallback } from "react";
import { type Slide } from "@/lib/mockSlides";
import { threadMessagesForGenerate } from "@/lib/threadMessagesForGenerate";
import SlideGraphView from "@/components/slides/SlideGraphView";
import PresentMode from "@/components/present/PresentMode";

type AppView = "chat" | "loading" | "slides";

export default function Home() {
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <HomeContent />
    </AssistantRuntimeProvider>
  );
}

function HomeContent() {
  const threadRuntime = useThreadRuntime();

  const [view, setView] = useState<AppView>("chat");
  const [hasMessages, setHasMessages] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [presentFromIndex, setPresentFromIndex] = useState(0);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setView("loading");

    const rawMessages = threadRuntime.getState().messages;
    const messages = threadMessagesForGenerate(rawMessages as unknown[]);
    const body =
      messages.length > 0
        ? { messages }
        : { content: "Generate a presentation" };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Server error (${res.status})`
        );
      }

      const data = await res.json();
      console.log("Generate response:", data);
      setSlides(data.slides);
      try {
        sessionStorage.setItem("slideforge_slides", JSON.stringify(data.slides));
      } catch {}
      setView("slides");
    } catch (err) {
      console.error("Generate error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setView("chat");
    }
  }, [threadRuntime]);

  const handlePresent = useCallback((index: number) => {
    setPresentFromIndex(index);
  }, []);

  const handleEditSlide = useCallback((index: number, patch: Partial<import("@/lib/mockSlides").Slide>) => {
    setSlides((prev) => {
      const updated = prev.map((s, i) => (i === index ? { ...s, ...patch } : s));
      try {
        sessionStorage.setItem("slideforge_slides", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleDownloadPptx = useCallback(async () => {
    try {
      const res = await fetch("/api/export/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "flowdeck-presentation.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PPTX export error:", err);
    }
  }, [slides]);

  return (
      <div className="h-dvh bg-zinc-950 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
                />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
              SlideForge
            </h1>
            <span className="text-[10px] font-medium text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
              AI
            </span>
          </div>

          <div className="flex items-center gap-3">
            {view === "slides" && (
              <button
                onClick={() => setView("chat")}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
                Back to Chat
              </button>
            )}

            {view === "chat" && hasMessages && (
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200 hover:scale-105 hover:shadow-blue-500/30"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
                Generate Presentation
              </button>
            )}

            {view === "slides" && slides.length > 0 && (
              <PresentMode
                slides={slides}
                startIndex={presentFromIndex}
                onExit={() => {}}
                getQaMessages={() =>
                  threadMessagesForGenerate(
                    threadRuntime.getState().messages as unknown[]
                  )
                }
              />
            )}
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-slide-down">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400/60 hover:text-red-300 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {view === "chat" && (
            <Chat
              onMessagesChange={setHasMessages}
              slides={slides}
              hasThreadMessages={hasMessages}
              onOpenSlideIndex={(index) => {
                setPresentFromIndex(index);
                setView("slides");
              }}
            />
          )}

          {view === "loading" && <LoadingView />}

          {view === "slides" && slides.length > 0 && (
            <div className="h-full overflow-y-auto">
              <div className="max-w-7xl mx-auto px-6 py-8 animate-slide-up">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Your Presentation
                    </h2>
                    <p className="text-zinc-400 mt-1 text-sm">
                      {slides.length} slides • Graph shows trigger-word paths;
                      click a node to preview
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadPptx}
                      className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg transition-all"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                        />
                      </svg>
                      Download PPTX
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg transition-all"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                        />
                      </svg>
                      Regenerate
                    </button>
                  </div>
                </div>
                <div className="stagger-children">
                  <SlideGraphView
                    slides={slides}
                    onPresentFromSlide={handlePresent}
                    onEditSlide={handleEditSlide}
                    onSlidesChange={setSlides}
                    onRefineError={setError}
                    onRefineSuccess={() => setError(null)}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      {/* Animated logo */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center animate-pulse-glow">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
            />
          </svg>
        </div>
        {/* Orbiting sparkle */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3">
            <svg viewBox="0 0 24 24" fill="currentColor" className="text-purple-400 w-full h-full">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-100 mb-2">
          Generating your presentation…
        </h2>
        <p className="text-sm text-zinc-400">
          Our AI agents are crafting your slides
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-shimmer w-full" />
      </div>
    </div>
  );
}
