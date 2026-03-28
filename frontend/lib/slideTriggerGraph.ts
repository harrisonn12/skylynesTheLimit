import type { Slide } from '@/lib/mockSlides';

export interface TriggerGraphEdge {
  from: number;
  to: number;
  label: string;
}

/** Slide text blob for matching trigger words (same idea as voice: substring). */
function slideTextBlob(slide: Slide): string {
  return `${slide.title} ${slide.body.join(' ')}`.toLowerCase();
}

/**
 * Directed edges: from a slide that *mentions* a word → to the slide that
 * *listens* for that trigger in present mode. If no slide mentions the word,
 * the edge starts from slide 0 (title) so every trigger still appears on the graph.
 */
export function buildTriggerGraphEdges(slides: Slide[]): TriggerGraphEdge[] {
  const raw: TriggerGraphEdge[] = [];

  for (let j = 0; j < slides.length; j++) {
    const triggers = slides[j].trigger_words ?? [];
    for (const w of triggers) {
      const wl = w.toLowerCase().trim();
      if (!wl) continue;

      const sources = new Set<number>();
      for (let i = 0; i < slides.length; i++) {
        if (i === j) continue;
        if (slideTextBlob(slides[i]).includes(wl)) sources.add(i);
      }
      if (sources.size === 0 && j !== 0) sources.add(0);

      for (const i of sources) {
        raw.push({ from: i, to: j, label: w });
      }
    }
  }

  const seen = new Set<string>();
  return raw.filter((e) => {
    const k = `${e.from}-${e.to}-${e.label.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const VB_W = 1000;
const VB_H = 640;

export interface NodeLayout {
  x: number;
  y: number;
}

/** Evenly spaced on a circle (slide 0 at top). */
export function layoutSlideNodes(count: number): NodeLayout[] {
  if (count <= 0) return [];
  const cx = VB_W / 2;
  const cy = VB_H / 2;
  const r = Math.min(VB_W, VB_H) * 0.36;
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
}

export const GRAPH_VIEWBOX = { w: VB_W, h: VB_H };
