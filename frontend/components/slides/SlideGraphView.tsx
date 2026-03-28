'use client';

import { useId, useMemo, useState } from 'react';
import { type Slide } from '@/lib/mockSlides';
import SlideRenderer from './SlideRenderer';
import {
  buildTriggerGraphEdges,
  layoutSlideNodes,
  GRAPH_VIEWBOX,
  type TriggerGraphEdge,
} from '@/lib/slideTriggerGraph';

interface SlideGraphViewProps {
  slides: Slide[];
  onPresentFromSlide?: (index: number) => void;
  onEditSlide?: (index: number, patch: Partial<Slide>) => void;
}

function edgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bend: number
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * bend;
  const oy = (dx / len) * bend;
  return `M ${x1} ${y1} Q ${mx + ox} ${my + oy} ${x2} ${y2}`;
}

function pointOnQuad(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * x1 + 2 * u * t * cx + t * t * x2,
    y: u * u * y1 + 2 * u * t * cy + t * t * y2,
  };
}

function curvedEdgeWithLabel(
  edge: TriggerGraphEdge,
  pos: { x: number; y: number }[],
  bend: number
): { d: string; lx: number; ly: number; midX: number; midY: number } {
  const p1 = pos[edge.from];
  const p2 = pos[edge.to];
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * bend;
  const oy = (dx / len) * bend;
  const cpx = mx + ox;
  const cpy = my + oy;
  const d = edgePath(p1.x, p1.y, p2.x, p2.y, bend);
  const mid = pointOnQuad(p1.x, p1.y, cpx, cpy, p2.x, p2.y, 0.52);
  return { d, lx: mid.x, ly: mid.y, midX: cpx, midY: cpy };
}

export default function SlideGraphView({
  slides,
  onPresentFromSlide,
  onEditSlide,
}: SlideGraphViewProps) {
  const markerId = useId().replace(/:/g, '');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState<string[]>([]);

  const positions = useMemo(() => layoutSlideNodes(slides.length), [slides.length]);
  const edges = useMemo(() => buildTriggerGraphEdges(slides), [slides]);

  const edgeCurvatures = useMemo(() => {
    const keyCounts = new Map<string, number>();
    const bends: number[] = [];
    for (const e of edges) {
      const k = `${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`;
      const n = keyCounts.get(k) ?? 0;
      keyCounts.set(k, n + 1);
      const sign = n % 2 === 0 ? 1 : -1;
      const mag = 24 + Math.floor(n / 2) * 28;
      bends.push(sign * mag);
    }
    return bends;
  }, [edges]);

  function openEdit(index: number) {
    setEditTitle(slides[index].title);
    setEditBody([...slides[index].body]);
    setEditMode(true);
  }

  function saveEdit() {
    if (selectedIndex === null) return;
    onEditSlide?.(selectedIndex, { title: editTitle, body: editBody });
    setEditMode(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {selectedIndex !== null && (
        <div className="relative z-20">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-sm text-zinc-400">
              Slide {selectedIndex + 1} of {slides.length} — {slides[selectedIndex].type}
            </span>
            <div className="flex items-center gap-2">
              {onEditSlide && !editMode && (
                <button
                  type="button"
                  onClick={() => openEdit(selectedIndex)}
                  className="text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-1 rounded-lg transition-all"
                >
                  Edit
                </button>
              )}
              {onPresentFromSlide && (
                <button
                  type="button"
                  onClick={() => onPresentFromSlide(selectedIndex)}
                  className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  Present from here
                </button>
              )}
              <button
                type="button"
                onClick={() => { setSelectedIndex(null); setEditMode(false); }}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {editMode ? (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-zinc-800 text-zinc-100 text-base font-semibold rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Bullets</label>
                <div className="flex flex-col gap-2">
                  {editBody.map((bullet, bi) => (
                    <div key={bi} className="flex gap-2 items-start">
                      <textarea
                        value={bullet}
                        rows={1}
                        onChange={(e) => {
                          const updated = [...editBody];
                          updated[bi] = e.target.value;
                          setEditBody(updated);
                        }}
                        className="flex-1 bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setEditBody(editBody.filter((_, i) => i !== bi))}
                        className="text-zinc-600 hover:text-red-400 mt-2 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditBody([...editBody, ''])}
                    className="text-xs text-zinc-500 hover:text-zinc-300 text-left transition-colors"
                  >
                    + Add bullet
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-1.5 rounded-lg border border-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <SlideRenderer
              slide={slides[selectedIndex]}
              className="w-full rounded-xl border border-white/10 shadow-2xl"
            />
          )}
        </div>
      )}

      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden min-h-[min(70vh,640px)]">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500 via-transparent to-transparent" />
        <p className="relative z-10 px-4 pt-3 text-xs text-zinc-500">
          Nodes are slides. Arrows show voice triggers: saying the label (on the
          path) can jump to the target slide when it matches that slide&apos;s{' '}
          <span className="text-zinc-400">trigger_words</span>. Edges run from
          slides that mention the word to the slide that listens for it, or from
          slide 1 if the word isn&apos;t on any other slide.
        </p>

        <div className="relative w-full aspect-[1000/640] max-h-[min(70vh,640px)] mx-auto">
          <svg
            className="absolute inset-0 w-full h-full text-zinc-600"
            viewBox={`0 0 ${GRAPH_VIEWBOX.w} ${GRAPH_VIEWBOX.h}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <marker
                id={markerId}
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 7 3.5, 0 7" fill="#71717a" />
              </marker>
            </defs>
            {edges.map((e, idx) => {
              const { d, lx, ly } = curvedEdgeWithLabel(
                e,
                positions,
                edgeCurvatures[idx] ?? 0
              );
              return (
                <g key={`${e.from}-${e.to}-${e.label}-${idx}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke="#52525b"
                    strokeWidth={1.25}
                    markerEnd={`url(#${markerId})`}
                    opacity={0.65}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#a1a1aa"
                    style={{ fontSize: 11 }}
                  >
                    {e.label.length > 18 ? `${e.label.slice(0, 16)}…` : e.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {slides.map((slide, i) => {
            const p = positions[i];
            if (!p) return null;
            const leftPct = (p.x / GRAPH_VIEWBOX.w) * 100;
            const topPct = (p.y / GRAPH_VIEWBOX.h) * 100;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className="absolute z-[5] w-[min(44vw,200px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-zinc-950/95 text-left shadow-lg transition-all hover:scale-[1.03] hover:border-blue-500/60 hover:shadow-blue-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              >
                <div
                  className={`h-2 rounded-t-xl ${
                    i === 0
                      ? 'bg-gradient-to-r from-amber-500/80 to-orange-500/80'
                      : 'bg-gradient-to-r from-blue-600/80 to-purple-600/80'
                  }`}
                />
                <div className="p-2.5">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-zinc-500">
                      {i + 1}
                    </span>
                    <span className="text-[9px] uppercase tracking-wide text-zinc-600">
                      {slide.type}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-snug">
                    {slide.title}
                  </p>
                  {slide.trigger_words.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {slide.trigger_words.slice(0, 4).map((tw) => (
                        <span
                          key={tw}
                          className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300/90 border border-purple-500/20"
                        >
                          {tw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
