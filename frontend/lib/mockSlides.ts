export interface Slide {
  id: string;
  type: 'title' | 'concept' | 'comparison' | 'timeline' | 'evidence' | 'conclusion';
  title: string;
  body: string[];
  media: string[];
  speaker_notes: string;
  trigger_words: string[];
}

export const mockSlides: Slide[] = [
  {
    id: 'slide-1',
    type: 'title',
    title: 'The Future of AI Agents',
    body: ['How autonomous systems are reshaping software development'],
    media: [],
    speaker_notes: 'Welcome everyone. Today we explore how AI agents are fundamentally changing the way we build software.',
    trigger_words: ['AI', 'agents', 'future'],
  },
  {
    id: 'slide-2',
    type: 'concept',
    title: 'What Are AI Agents?',
    body: [
      'Autonomous systems that can reason, plan, and execute tasks',
      'Go beyond simple chat — they take actions in the real world',
      'Use tools like code editors, browsers, and APIs',
      'Can break complex goals into subtasks and coordinate',
    ],
    media: [],
    speaker_notes: "AI agents represent a paradigm shift. They don't just answer questions — they accomplish goals.",
    trigger_words: ['autonomous', 'reasoning', 'tools'],
  },
  {
    id: 'slide-3',
    type: 'comparison',
    title: 'Traditional Dev vs Agent-Assisted Dev',
    body: [
      'Manual coding & debugging',
      'Hours of boilerplate',
      'Context switching between tools',
      '---',
      'AI writes & reviews code',
      'Instant scaffolding & generation',
      'Unified agentic workflow',
    ],
    media: [],
    speaker_notes: 'The left column shows traditional development pain points. The right shows how agents solve each one.',
    trigger_words: ['comparison', 'traditional', 'modern'],
  },
  {
    id: 'slide-4',
    type: 'timeline',
    title: 'The Evolution of Developer Tools',
    body: [
      '2020 — GitHub Copilot: Autocomplete on steroids',
      '2023 — ChatGPT: Conversational coding assistant',
      '2024 — Agentic IDEs: AI that can edit files and run commands',
      '2025 — Multi-agent systems: Coordinated AI teams',
      '2026 — Autonomous dev: Agents that ship features end-to-end',
    ],
    media: [],
    speaker_notes: "Each year brings a quantum leap. We're now at the point where agents can handle entire features.",
    trigger_words: ['timeline', 'evolution', 'history'],
  },
  {
    id: 'slide-5',
    type: 'evidence',
    title: '10x Productivity Gains',
    body: [
      '"Teams using AI agents reported 10x faster prototyping and 3x fewer bugs in production."',
      '— Stanford AI Lab, 2026 Developer Productivity Study',
    ],
    media: [],
    speaker_notes: 'This stat is from a peer-reviewed study. The gains are real and measurable.',
    trigger_words: ['evidence', 'stats', 'productivity'],
  },
  {
    id: 'slide-6',
    type: 'concept',
    title: 'Key Architecture Patterns',
    body: [
      'Tool-augmented LLMs with structured outputs',
      'Multi-agent orchestration with task delegation',
      'Persistent memory via workspace notes and specs',
      'Human-in-the-loop checkpoints for quality control',
    ],
    media: [],
    speaker_notes: 'These are the building blocks. Every serious agent system uses some combination of these patterns.',
    trigger_words: ['architecture', 'patterns', 'design'],
  },
  {
    id: 'slide-7',
    type: 'evidence',
    title: '85% of Fortune 500 Companies',
    body: [
      '"85% of Fortune 500 companies have adopted AI-assisted development tools in 2026."',
      '— McKinsey Digital Transformation Report',
    ],
    media: [],
    speaker_notes: 'Enterprise adoption is accelerating faster than any previous dev tool category.',
    trigger_words: ['enterprise', 'adoption', 'fortune500'],
  },
  {
    id: 'slide-8',
    type: 'conclusion',
    title: 'The Agent Era Is Here',
    body: [
      "AI agents are not replacing developers — they're amplifying them",
      'Start with small, well-scoped agent tasks',
      'Build trust through human-in-the-loop workflows',
      'The teams that adopt agents earliest will have a massive competitive advantage',
    ],
    media: [],
    speaker_notes: 'Key takeaway: this is about augmentation, not replacement. Start experimenting today.',
    trigger_words: ['conclusion', 'action', 'next steps'],
  },
];
