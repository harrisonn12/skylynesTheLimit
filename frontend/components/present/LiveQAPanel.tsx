'use client';

import { FormEvent } from 'react';

type LiveQAPanelProps = {
  isListening: boolean;
  transcript: string;
  qaLoading: boolean;
  qaError: string | null;
  qaLastQuestion: string | null;
  qaAnswer: string | null;
  typedQuestion: string;
  onTypedQuestionChange: (value: string) => void;
  onSubmitTyped: (e: FormEvent) => void;
};

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 1.5a3 3 0 00-3 3v6a3 3 0 006 0v-6a3 3 0 00-3-3zM19 10.5V9a7 7 0 10-14 0v1.5M12 19v4m-3.5 0h7"
      />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

export default function LiveQAPanel({
  isListening,
  transcript,
  qaLoading,
  qaError,
  qaLastQuestion,
  qaAnswer,
  typedQuestion,
  onTypedQuestionChange,
  onSubmitTyped,
}: LiveQAPanelProps) {
  const showEmpty = !qaLoading && !qaLastQuestion && !qaError;

  return (
    <div
      className="relative aspect-video w-full h-full overflow-hidden text-white flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-zinc-950" aria-hidden />
      <div
        className="pointer-events-none absolute -top-1/2 left-1/2 h-[120%] w-[140%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(139,92,246,0.22),transparent)] blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[70%] w-[80%] bg-[radial-gradient(closest-side,rgba(34,211,238,0.14),transparent)] blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent)]"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 min-h-0 flex-col px-6 py-6 md:px-14 md:py-10">
        {/* Header */}
        <header className="shrink-0 flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-5 md:mb-7">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${
                  isListening
                    ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40'
                    : 'bg-white/5 text-zinc-400 ring-white/10'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${isListening ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-zinc-500'}`}
                  aria-hidden
                />
                Live Q&amp;A
              </span>
              {isListening && (
                <span className="hidden sm:inline text-xs text-zinc-500">Mic active — speak clearly</span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-r from-violet-200 via-white to-cyan-200 bg-clip-text text-transparent">
                Open the floor
              </span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-zinc-400 leading-relaxed">
              Answers are grounded in your chat thread and uploads. Say{' '}
              <span className="text-zinc-200 font-medium">&quot;continue presentation&quot;</span> to leave this slide.
            </p>
          </div>
          {transcript.trim() && (
            <div className="shrink-0 max-w-md rounded-xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/90 mb-1">Heard</p>
              <p className="text-sm text-zinc-200 leading-snug line-clamp-3">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}
        </header>

        {/* Main stage */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-5">
          {qaLoading && (
            <div className="flex-1 min-h-[12rem] rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/50 to-zinc-950/80 flex flex-col items-center justify-center gap-5 p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/30" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-violet-400 animate-spin" />
                <SparkIcon className="absolute inset-0 m-auto h-7 w-7 text-violet-300/90" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-white tracking-tight">Grounding your answer</p>
                <p className="text-sm text-zinc-400">Searching your materials and slide deck…</p>
              </div>
            </div>
          )}

          {qaError && (
            <div
              role="alert"
              className="rounded-2xl border border-red-500/35 bg-red-950/40 px-5 py-4 text-red-200 text-sm leading-relaxed"
            >
              {qaError}
            </div>
          )}

          {!qaLoading && qaLastQuestion && (
            <article className="relative rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/40 to-zinc-950/90 p-6 md:p-8 shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_24px_48px_-12px_rgba(0,0,0,0.5)]">
              <div className="absolute -left-px top-6 bottom-6 w-1 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-500 opacity-90" aria-hidden />
              <div className="flex items-start gap-4 pl-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 ring-1 ring-violet-400/30">
                  <MicIcon className="h-6 w-6 text-violet-200" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300/90 mb-2">
                    Question
                  </h2>
                  <p className="text-xl md:text-2xl font-medium text-white leading-snug text-balance">
                    {qaLastQuestion}
                  </p>
                </div>
              </div>
            </article>
          )}

          {!qaLoading && qaAnswer && (
            <article className="relative flex-1 min-h-0 rounded-2xl border border-cyan-500/20 overflow-hidden flex flex-col shadow-[0_0_60px_-12px_rgba(34,211,238,0.25)]">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-zinc-950/95 to-zinc-950" aria-hidden />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" aria-hidden />
              <div className="relative flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/25">
                    <SparkIcon className="h-6 w-6 text-cyan-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/90 mb-3">
                      Answer
                    </h2>
                    <p className="text-base md:text-lg text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {qaAnswer}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          )}

          {showEmpty && !qaLoading && (
            <div className="flex-1 min-h-[10rem] rounded-2xl border border-dashed border-white/12 bg-white/[0.02] flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/10 ring-1 ring-white/10">
                <MicIcon className="h-10 w-10 text-zinc-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-zinc-200">Waiting for a question</p>
                <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
                  Speak toward the mic or type below. Your audience will see the answer on this slide.
                </p>
              </div>
            </div>
          )}
        </div>

        <form
          className="shrink-0 mt-5 flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/5"
          onSubmit={onSubmitTyped}
        >
          <input
            type="text"
            value={typedQuestion}
            onChange={(e) => onTypedQuestionChange(e.target.value)}
            placeholder="Type a question for the room…"
            className="flex-1 rounded-xl bg-zinc-900/80 border border-white/10 px-4 py-3.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-shadow"
            disabled={qaLoading}
            aria-label="Type a question"
          />
          <button
            type="submit"
            disabled={qaLoading || !typedQuestion.trim()}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-35 disabled:pointer-events-none text-white font-semibold px-8 py-3.5 shadow-lg shadow-violet-900/40 transition-all"
          >
            Ask live
          </button>
        </form>
      </div>
    </div>
  );
}
