'use client';

import { useEffect, useState } from 'react';

interface VoiceControllerProps {
  isListening: boolean;
  transcript: string;
  matchedWord: string | null;
}

export default function VoiceController({ isListening, transcript, matchedWord }: VoiceControllerProps) {
  const [showMatch, setShowMatch] = useState<string | null>(null);
  const [displayTranscript, setDisplayTranscript] = useState('');

  // Show matched word with auto-dismiss
  useEffect(() => {
    if (matchedWord) {
      setShowMatch(matchedWord);
      const timer = setTimeout(() => setShowMatch(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [matchedWord]);

  // Show transcript briefly then fade
  useEffect(() => {
    if (transcript) {
      setDisplayTranscript(transcript);
      const timer = setTimeout(() => setDisplayTranscript(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [transcript]);

  if (!isListening) return null;

  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-[10000] pointer-events-none">
      {/* Mic indicator */}
      <div className="flex items-center gap-2 bg-black/70 backdrop-blur-xl rounded-full px-4 py-2 border border-white/10">
        {/* Pulsing dot */}
        <div className="relative flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <div className="absolute w-3 h-3 rounded-full bg-red-500/50 animate-ping" />
        </div>

        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] h-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-[3px] bg-red-400 rounded-full animate-voice-bar"
              style={{
                animationDelay: `${i * 0.15}s`,
                height: '100%',
              }}
            />
          ))}
        </div>

        <span className="text-xs text-gray-300 ml-1 font-medium">LISTENING</span>
      </div>

      {/* Live transcript */}
      {displayTranscript && (
        <div className="bg-black/70 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10 max-w-xs animate-fade-in">
          <p className="text-sm text-gray-300 italic truncate">&ldquo;{displayTranscript}&rdquo;</p>
        </div>
      )}

      {/* Matched trigger word */}
      {showMatch && (
        <div className="bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/20 animate-trigger-match">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm text-white font-semibold">Jumped: &ldquo;{showMatch}&rdquo;</span>
          </div>
        </div>
      )}
    </div>
  );
}
