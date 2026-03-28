'use client';

import { useState } from 'react';
import { type Slide } from '@/lib/mockSlides';
import SlideRenderer from './SlideRenderer';

interface SlidePreviewProps {
  slides: Slide[];
  onPresentFromSlide?: (index: number) => void;
}

export default function SlidePreview({ slides, onPresentFromSlide }: SlidePreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Full-size preview of selected slide */}
      {selectedIndex !== null && (
        <div className="relative">
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
          <SlideRenderer
            slide={slides[selectedIndex]}
            className="w-full rounded-xl border border-white/10 shadow-2xl"
          />
          <div className="flex items-center justify-between mt-3 px-2">
            <span className="text-sm text-gray-400">
              Slide {selectedIndex + 1} of {slides.length} — {slides[selectedIndex].type}
            </span>
            {onPresentFromSlide && (
              <button
                onClick={() => onPresentFromSlide(selectedIndex)}
                className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                Present from here
              </button>
            )}
          </div>
        </div>
      )}

      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setSelectedIndex(i)}
            className={`group relative rounded-lg overflow-hidden border transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${
              selectedIndex === i
                ? 'border-blue-500 ring-2 ring-blue-500/30'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <SlideRenderer slide={slide} className="w-full pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <span className="text-xs font-mono text-gray-400">{i + 1}</span>
              <p className="text-sm text-white truncate">{slide.title}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
