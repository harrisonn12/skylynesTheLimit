"use client";

import { useThreadRuntime } from "@assistant-ui/react";
import { useEffect, useRef, useState } from "react";

type ToastPayload = {
  key: number;
  title: string;
  subtitle?: string;
};

function summarizeUserMessage(msg: {
  role: string;
  content?: readonly { type: string; text?: string; filename?: string }[];
  attachments?: readonly { name?: string }[];
}): { title: string; subtitle?: string } {
  const parts = msg.content ?? [];
  const fileNames: string[] = [];
  let hasText = false;

  for (const p of parts) {
    if (p.type === "text" && (p.text ?? "").trim()) hasText = true;
    if (p.type === "file" && p.filename) fileNames.push(p.filename);
    if (p.type === "image" && p.filename) fileNames.push(p.filename);
  }

  for (const a of msg.attachments ?? []) {
    if (a?.name) fileNames.push(a.name);
  }

  if (fileNames.length > 0) {
    const listed =
      fileNames.length <= 2
        ? fileNames.join(", ")
        : `${fileNames.slice(0, 2).join(", ")} +${fileNames.length - 2} more`;
    return {
      title: "Captured for your presentation",
      subtitle: hasText
        ? `Notes and ${fileNames.length === 1 ? "file" : "files"}: ${listed}`
        : `Files: ${listed}`,
    };
  }

  if (hasText) {
    return {
      title: "Captured for your presentation",
      subtitle: "Your message was added to the deck brief",
    };
  }

  return {
    title: "Captured for your presentation",
    subtitle: "Content added to the deck brief",
  };
}

/**
 * Shows a short toast whenever thread content that feeds slide generation is added:
 * user sends (text / attachments) or the assistant finishes a reply.
 */
export function DeckCaptureFeedback() {
  const threadRuntime = useThreadRuntime();
  const seenKeysRef = useRef(new Set<string>());
  const primedRef = useRef(false);
  const toastSeq = useRef(0);
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    return threadRuntime.subscribe(() => {
      const messages = threadRuntime.getState().messages;

      if (!primedRef.current) {
        for (const m of messages) {
          if (m.role === "user") seenKeysRef.current.add(`u:${m.id}`);
          if (
            m.role === "assistant" &&
            m.status?.type === "complete"
          ) {
            seenKeysRef.current.add(`a:${m.id}`);
          }
        }
        primedRef.current = true;
        return;
      }

      for (const m of messages) {
        if (m.role === "user") {
          const key = `u:${m.id}`;
          if (seenKeysRef.current.has(key)) continue;
          seenKeysRef.current.add(key);
          const { title, subtitle } = summarizeUserMessage(m);
          toastSeq.current += 1;
          setToast({ key: toastSeq.current, title, subtitle });
          continue;
        }

        if (m.role === "assistant" && m.status?.type === "complete") {
          const key = `a:${m.id}`;
          if (seenKeysRef.current.has(key)) continue;
          seenKeysRef.current.add(key);
          toastSeq.current += 1;
          setToast({
            key: toastSeq.current,
            title: "Assistant reply captured",
            subtitle: "This exchange will shape your generated slides",
          });
        }
      }
    });
  }, [threadRuntime]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-28 left-1/2 z-[100] flex w-[min(92vw,22rem)] -translate-x-1/2 justify-center px-3"
      role="status"
      aria-live="polite"
    >
      <div
        key={toast.key}
        className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-emerald-500/25 bg-zinc-900/95 px-4 py-3 shadow-lg shadow-emerald-500/10 backdrop-blur-md animate-scale-in"
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-zinc-100">{toast.title}</p>
          {toast.subtitle ? (
            <p className="mt-0.5 text-xs leading-snug text-zinc-400">
              {toast.subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
