'use client';

import { useState, useEffect } from 'react';
import { mockSlides, type Slide } from '@/lib/mockSlides';
import SlidePreview from '@/components/slides/SlidePreview';
import PresentMode from '@/components/present/PresentMode';

export default function PresentPage() {
  const [slides, setSlides] = useState<Slide[]>(mockSlides);
  const [presentFromIndex, setPresentFromIndex] = useState<number | undefined>(undefined);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('slideforge_slides');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(parsed);
        }
      }
    } catch {}
  }, []);

  const handlePresent = (index: number) => {
    setPresentFromIndex(index);
    setPresenting(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white">Slide Deck Preview</h1>
            <p className="text-gray-400 mt-1">{slides.length} slides</p>
          </div>
          <PresentMode
            slides={slides}
            startIndex={presentFromIndex ?? 0}
            onExit={() => setPresenting(false)}
          />
        </div>

        {/* Slide grid */}
        <SlidePreview slides={slides} onPresentFromSlide={handlePresent} />
      </div>
    </div>
  );
}
