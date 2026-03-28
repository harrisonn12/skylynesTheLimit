'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { type Slide } from '@/lib/mockSlides';
import SlideRenderer from '../slides/SlideRenderer';
import VoiceController from './VoiceController';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';

interface PresentModeProps {
  slides: Slide[];
  startIndex?: number;
  onExit?: () => void;
}

export default function PresentMode({ slides, startIndex = 0, onExit }: PresentModeProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isActive, setIsActive] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [animating, setAnimating] = useState(false);
  const [matchedWord, setMatchedWord] = useState<string | null>(null);
  const matchKeyRef = useRef(0);

  const { isListening, transcript, startListening, stopListening, supported } = useVoiceNavigation();

  const total = slides.length;
  const currentSlide = slides[currentIndex];

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

  const exitPresent = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setIsActive(false);
    stopListening();
    onExit?.();
  }, [onExit, stopListening]);

  const enterPresent = useCallback(() => {
    setIsActive(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    if (supported) {
      startListening();
    }
  }, [supported, startListening]);

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

    // Navigation commands
    if (/\b(next|next slide)\b/.test(text)) {
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
      goToSlide(total - 1);
      return;
    }

    // Trigger word matching — check all slides
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
  }, [transcript, isActive, goNext, goPrev, goToSlide, slides, total]);

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
      {/* Voice control overlay */}
      <VoiceController
        isListening={isListening}
        transcript={transcript}
        matchedWord={matchedWord}
        key={matchKeyRef.current}
      />

      {/* Slide area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className={`w-full h-full transition-all duration-300 ease-out ${slideTransform}`}>
          <SlideRenderer slide={currentSlide} className="w-full h-full" />
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <button onClick={goPrev} disabled={currentIndex === 0} className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            ← Prev
          </button>
          <span className="text-gray-400 font-mono">
            {currentIndex + 1} / {total}
          </span>
          <button onClick={goNext} disabled={currentIndex === total - 1} className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            Next →
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowNotes((p) => !p)} className={`transition-colors ${showNotes ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>
            Notes (S)
          </button>
          <button onClick={exitPresent} className="text-gray-400 hover:text-white transition-colors">
            Exit (Esc)
          </button>
        </div>
      </div>

      {/* Speaker notes overlay */}
      {showNotes && currentSlide.speaker_notes && (
        <div
          className="absolute bottom-16 left-6 right-6 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 p-6 max-h-48 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Speaker Notes</h4>
          <p className="text-gray-300 text-lg leading-relaxed">{currentSlide.speaker_notes}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
