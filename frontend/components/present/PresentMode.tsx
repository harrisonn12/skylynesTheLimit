'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type Slide } from '@/lib/mockSlides';
import type { GenerateMessagePayload } from '@/lib/threadMessagesForGenerate';
import SlideRenderer from '../slides/SlideRenderer';
import LiveQAPanel from './LiveQAPanel';
import VoiceController from './VoiceController';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';

/** Reserved presenter phrase → jump to live Q&A slide (Web Speech often drops “?”). */
const ANY_QUESTIONS_RE =
  /\bany questions?\b|\bhave any questions\b|\bdoes anyone have (any )?questions\b|\bgot any questions\b/i;

const EXIT_QA_RE =
  /\b(continue presentation|resume (the )?slides|end q\s*a|back to (the )?slides|exit q\s*a)\b/i;

/** Standalone utterance arms voice Q&A for ~25s; same phrases can prefix a question in one breath. */
const QA_ARM_ONLY_RE = /^(next question|new question|ask now)[\s.!,?]*$/i;

function extractQuestionAfterArmPhrase(text: string): string | null {
  const re = /\b(next question|new question|ask now)\b\s*[:,]?\s*/i;
  const m = text.match(re);
  if (!m || m.index === undefined) return null;
  const rest = text.slice(m.index + m[0].length).trim();
  return rest.length > 0 ? rest : null;
}

/** True when transcript should advance slides — excludes "next question" (Q&A arm phrase). */
function voiceWantsNextSlide(text: string): boolean {
  const lower = text.toLowerCase();
  if (/\bnext question\b/.test(lower)) return false;
  return /\b(next|next slide)\b/.test(lower);
}

function isQaCommandNoise(text: string): boolean {
  const t = text.trim();
  const lower = t.toLowerCase();
  if (ANY_QUESTIONS_RE.test(lower)) return true;
  if (voiceWantsNextSlide(lower)) return true;
  if (/\b(back|previous|go back|previous slide|first slide|last slide|go to start|go to end)\b/.test(lower))
    return true;
  if (EXIT_QA_RE.test(lower)) return true;
  return false;
}

interface PresentModeProps {
  slides: Slide[];
  startIndex?: number;
  onExit?: () => void;
  /** Chat thread + file parts used as the Q&A knowledge base (same shape as Generate). */
  getQaMessages?: () => GenerateMessagePayload[];
}

export default function PresentMode({
  slides,
  startIndex = 0,
  onExit,
  getQaMessages,
}: PresentModeProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isActive, setIsActive] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [animating, setAnimating] = useState(false);
  const [matchedWord, setMatchedWord] = useState<string | null>(null);
  const matchKeyRef = useRef(0);
  const preQaIndexRef = useRef(0);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [qaLastQuestion, setQaLastQuestion] = useState<string | null>(null);
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [typedQuestion, setTypedQuestion] = useState('');
  const qaFinalHandlerRef = useRef<(text: string) => void>(() => {});
  const qaVoiceArmUntilRef = useRef(0);
  const qaArmExpireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [qaVoiceArmed, setQaVoiceArmed] = useState(false);

  const qaSlideIndex = slides.length;
  const total = slides.length + 1;
  const isQaSlide = currentIndex === qaSlideIndex;

  const { isListening, transcript, startListening, stopListening, clearTranscript, supported } =
    useVoiceNavigation({
      onFinalTranscript: (t) => qaFinalHandlerRef.current(t),
    });

  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const getQaMessagesRef = useRef(getQaMessages);
  getQaMessagesRef.current = getQaMessages;

  const currentSlide = useMemo(() => {
    if (isQaSlide) return null;
    return slides[currentIndex] ?? slides[0];
  }, [slides, currentIndex, isQaSlide]);

  const goTo = useCallback(
    (next: number, dir: 'left' | 'right') => {
      if (animating || next < 0 || next >= total) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrentIndex(next);
        setDirection(null);
        setAnimating(false);
      }, 300);
    },
    [animating, total],
  );

  const goNext = useCallback(() => goTo(currentIndex + 1, 'left'), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1, 'right'), [currentIndex, goTo]);

  const goToSlide = useCallback(
    (index: number) => {
      if (index === currentIndex || index < 0 || index >= total) return;
      goTo(index, index > currentIndex ? 'left' : 'right');
    },
    [currentIndex, total, goTo],
  );

  const disarmVoiceQa = useCallback(() => {
    if (qaArmExpireTimerRef.current) {
      clearTimeout(qaArmExpireTimerRef.current);
      qaArmExpireTimerRef.current = null;
    }
    qaVoiceArmUntilRef.current = 0;
    setQaVoiceArmed(false);
  }, []);

  const armVoiceQa = useCallback(() => {
    if (qaArmExpireTimerRef.current) {
      clearTimeout(qaArmExpireTimerRef.current);
    }
    qaVoiceArmUntilRef.current = Date.now() + 25_000;
    setQaVoiceArmed(true);
    clearTranscript();
    qaArmExpireTimerRef.current = setTimeout(() => {
      qaVoiceArmUntilRef.current = 0;
      setQaVoiceArmed(false);
      qaArmExpireTimerRef.current = null;
    }, 25_000);
  }, [clearTranscript]);

  const submitAudienceQuestion = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || qaLoading) return;
      setQaLoading(true);
      setQaError(null);
      try {
        const messages = getQaMessagesRef.current?.() ?? [];
        const deck = slidesRef.current.map((s) => ({ title: s.title, body: s.body }));
        const res = await fetch('/api/qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            ...(messages.length > 0 ? { messages } : {}),
            slides: deck,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : `Request failed (${res.status})`,
          );
        }
        setQaLastQuestion(q);
        setQaAnswer(typeof data.answer === 'string' ? data.answer : '');
      } catch (e) {
        setQaError(e instanceof Error ? e.message : 'Could not get an answer.');
      } finally {
        setQaLoading(false);
        disarmVoiceQa();
        clearTranscript();
      }
    },
    [qaLoading, clearTranscript, disarmVoiceQa],
  );

  useEffect(() => {
    qaFinalHandlerRef.current = (text: string) => {
      if (!isActive || currentIndex !== qaSlideIndex || qaLoading) return;
      const raw = text.trim();
      if (raw.length < 2) return;

      const hasAnswerVisible = Boolean(qaAnswer?.trim());

      const combined = extractQuestionAfterArmPhrase(raw);
      if (combined && combined.length >= 3) {
        void submitAudienceQuestion(combined);
        return;
      }

      if (QA_ARM_ONLY_RE.test(raw)) {
        if (hasAnswerVisible) armVoiceQa();
        return;
      }

      if (isQaCommandNoise(raw)) return;

      if (hasAnswerVisible) {
        if (Date.now() < qaVoiceArmUntilRef.current) {
          void submitAudienceQuestion(raw);
        }
        return;
      }

      if (raw.length >= 3) {
        void submitAudienceQuestion(raw);
      }
    };
  }, [
    isActive,
    currentIndex,
    qaSlideIndex,
    qaLoading,
    qaAnswer,
    submitAudienceQuestion,
    armVoiceQa,
  ]);

  const exitPresent = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setIsActive(false);
    stopListening();
    disarmVoiceQa();
    setQaError(null);
    setTypedQuestion('');
    onExit?.();
  }, [onExit, stopListening, disarmVoiceQa]);

  const enterPresent = useCallback(() => {
    const maxStart = Math.max(0, slides.length - 1);
    const idx = Math.min(Math.max(0, startIndex), maxStart);
    setCurrentIndex(idx);
    setQaError(null);
    setQaLastQuestion(null);
    setQaAnswer(null);
    setTypedQuestion('');
    disarmVoiceQa();
    setIsActive(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    if (supported) {
      startListening();
    }
  }, [supported, startListening, slides.length, startIndex, disarmVoiceQa]);

  useEffect(() => {
    if (!isQaSlide) disarmVoiceQa();
  }, [isQaSlide, disarmVoiceQa]);

  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'Escape':
          exitPresent();
          break;
        case 's':
        case 'S':
          setShowNotes((p) => !p);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, goNext, goPrev, exitPresent]);

  // Voice command processing
  useEffect(() => {
    if (!isActive || !transcript) return;

    const text = transcript.toLowerCase().trim();

    if (currentIndex === qaSlideIndex) {
      if (voiceWantsNextSlide(text)) {
        goNext();
        clearTranscript();
        return;
      }
      if (/\b(back|previous|go back|previous slide)\b/.test(text)) {
        goPrev();
        clearTranscript();
        return;
      }
      if (/\b(first slide|go to start|first)\b/.test(text)) {
        goToSlide(0);
        clearTranscript();
        return;
      }
      if (/\b(last slide|go to end|last)\b/.test(text)) {
        goToSlide(Math.max(0, slides.length - 1));
        clearTranscript();
        return;
      }
      if (EXIT_QA_RE.test(text)) {
        goTo(preQaIndexRef.current, 'right');
        clearTranscript();
        return;
      }
      return;
    }

    if (ANY_QUESTIONS_RE.test(text)) {
      preQaIndexRef.current = currentIndex;
      goToSlide(qaSlideIndex);
      matchKeyRef.current += 1;
      setMatchedWord('Q&A');
      clearTranscript();
      return;
    }

    if (voiceWantsNextSlide(text)) {
      goNext();
      return;
    }
    if (/\b(back|previous|go back|previous slide)\b/.test(text)) {
      goPrev();
      return;
    }
    if (/\b(first slide|go to start|first)\b/.test(text)) {
      goToSlide(0);
      return;
    }
    if (/\b(last slide|go to end|last)\b/.test(text)) {
      goToSlide(Math.max(0, slides.length - 1));
      return;
    }

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      for (const trigger of slide.trigger_words) {
        if (text.includes(trigger.toLowerCase())) {
          goToSlide(i);
          matchKeyRef.current += 1;
          setMatchedWord(trigger);
          return;
        }
      }
    }
  }, [
    transcript,
    isActive,
    currentIndex,
    qaSlideIndex,
    goNext,
    goPrev,
    goToSlide,
    goTo,
    slides,
    total,
    clearTranscript,
  ]);

  // Stop listening when exiting via fullscreen change
  // Listen for fullscreen exit
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && isActive) {
        setIsActive(false);
        stopListening();
        onExit?.();
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [isActive, onExit, stopListening]);

  if (!isActive) {
    return (
      <button
        onClick={enterPresent}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200 hover:scale-105"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Present
      </button>
    );
  }

  const slideTransform = direction === 'left'
    ? 'translate-x-[-100%] opacity-0'
    : direction === 'right'
      ? 'translate-x-[100%] opacity-0'
      : 'translate-x-0 opacity-100';

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col" onClick={goNext}>
      <VoiceController
        isListening={isListening}
        transcript={transcript}
        matchedWord={matchedWord}
        key={matchKeyRef.current}
      />

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className={`w-full h-full transition-all duration-300 ease-out ${slideTransform}`}>
          {isQaSlide ? (
            <LiveQAPanel
              isListening={isListening}
              transcript={transcript}
              qaLoading={qaLoading}
              qaError={qaError}
              qaLastQuestion={qaLastQuestion}
              qaAnswer={qaAnswer}
              hasAnswerVisible={Boolean(qaAnswer?.trim())}
              voiceArmed={qaVoiceArmed}
              typedQuestion={typedQuestion}
              onTypedQuestionChange={setTypedQuestion}
              onSubmitTyped={(e) => {
                e.preventDefault();
                void submitAudienceQuestion(typedQuestion);
                setTypedQuestion('');
              }}
            />
          ) : (
            currentSlide && <SlideRenderer slide={currentSlide} className="w-full h-full" />
          )}
        </div>
      </div>

      <div
        className="flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <button onClick={goPrev} disabled={currentIndex === 0} className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            ← Prev
          </button>
          <span className="text-gray-400 font-mono">
            {isQaSlide ? 'Q&A' : `${currentIndex + 1} / ${total}`}
          </span>
          <button onClick={goNext} disabled={currentIndex === total - 1} className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            Next →
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowNotes((p) => !p)}
            disabled={isQaSlide}
            className={`transition-colors disabled:opacity-25 disabled:pointer-events-none ${showNotes ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            Notes (S)
          </button>
          <button onClick={exitPresent} className="text-gray-400 hover:text-white transition-colors">
            Exit (Esc)
          </button>
        </div>
      </div>

      {showNotes && currentSlide?.speaker_notes && (
        <div
          className="absolute bottom-16 left-6 right-6 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 p-6 max-h-48 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Speaker Notes</h4>
          <p className="text-gray-300 text-lg leading-relaxed">{currentSlide.speaker_notes}</p>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
