'use client';

import { type Slide } from '@/lib/mockSlides';

interface SlideRendererProps {
  slide: Slide;
  className?: string;
}

function TitleSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-16">
      <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent leading-tight mb-8">
        {slide.title}
      </h1>
      {slide.body[0] && (
        <p className="text-2xl md:text-3xl text-gray-400 font-light max-w-3xl">
          {slide.body[0]}
        </p>
      )}
      <div className="mt-12 w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
    </div>
  );
}

function ConceptSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col justify-center h-full px-16 md:px-24">
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-10">{slide.title}</h2>
      <ul className="space-y-5">
        {slide.body.map((item: string, i: number) => (
          <li key={i} className="flex items-start gap-4 text-xl md:text-2xl text-gray-300">
            <span className="mt-2 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonSlide({ slide }: { slide: Slide }) {
  const dividerIdx = slide.body.indexOf('---');
  const left = dividerIdx >= 0 ? slide.body.slice(0, dividerIdx) : slide.body.slice(0, Math.ceil(slide.body.length / 2));
  const right = dividerIdx >= 0 ? slide.body.slice(dividerIdx + 1) : slide.body.slice(Math.ceil(slide.body.length / 2));

  return (
    <div className="flex flex-col justify-center h-full px-16 md:px-24">
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center">{slide.title}</h2>
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
          <h3 className="text-lg font-semibold text-red-400 uppercase tracking-wider mb-6">Before</h3>
          <ul className="space-y-4">
            {left.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-lg text-gray-400">
                <span className="text-red-400 mt-0.5">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white/5 rounded-2xl p-8 border border-blue-500/30">
          <h3 className="text-lg font-semibold text-blue-400 uppercase tracking-wider mb-6">After</h3>
          <ul className="space-y-4">
            {right.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-lg text-gray-300">
                <span className="text-blue-400 mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TimelineSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col justify-center h-full px-16 md:px-24">
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-12">{slide.title}</h2>
      <div className="relative pl-8 border-l-2 border-blue-500/40 space-y-8">
        {slide.body.map((item: string, i: number) => {
          const [year, ...rest] = item.split(' — ');
          return (
            <div key={i} className="relative">
              <div className="absolute -left-[calc(2rem+5px)] w-3 h-3 rounded-full bg-blue-400 ring-4 ring-gray-900" />
              <span className="text-blue-400 font-mono font-bold text-lg">{year}</span>
              {rest.length > 0 && (
                <span className="text-xl text-gray-300 ml-3">— {rest.join(' — ')}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-16 md:px-24 text-center">
      <div className="text-6xl text-blue-400/30 mb-4">"</div>
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">{slide.title}</h2>
      {slide.body[0] && (
        <blockquote className="text-xl md:text-2xl text-gray-300 italic max-w-4xl leading-relaxed mb-6">
          {slide.body[0]}
        </blockquote>
      )}
      {slide.body[1] && (
        <cite className="text-lg text-blue-400 not-italic font-medium">{slide.body[1]}</cite>
      )}
    </div>
  );
}

function ConclusionSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-16 md:px-24 text-center">
      <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-10">
        {slide.title}
      </h2>
      <ul className="space-y-5 max-w-3xl">
        {slide.body.map((item: string, i: number) => (
          <li key={i} className="text-xl md:text-2xl text-gray-300 flex items-start gap-3">
            <span className="text-purple-400 mt-1">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-12 w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
    </div>
  );
}

const renderers: Record<Slide['type'], React.FC<{ slide: Slide }>> = {
  title: TitleSlide,
  concept: ConceptSlide,
  comparison: ComparisonSlide,
  timeline: TimelineSlide,
  evidence: EvidenceSlide,
  conclusion: ConclusionSlide,
};

export default function SlideRenderer({ slide, className = '' }: SlideRendererProps) {
  const Renderer = renderers[slide.type] ?? ConceptSlide;
  return (
    <div className={`bg-gray-950 text-white aspect-video overflow-hidden relative ${className}`}>
      <Renderer slide={slide} />
    </div>
  );
}
