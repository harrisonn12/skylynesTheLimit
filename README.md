# FlowDeck

**AI-powered presentation engine — just talk, the right slide appears.**

FlowDeck replaces the traditional "click through slides in order" model. You upload your materials, chat with the AI to refine context, then generate a library of slides. When you present, FlowDeck listens to what you say and automatically shows the most relevant slide — no clicker, no fixed order.

---

## The Problem

- Building slide decks takes hours
- Presenters are locked into a fixed slide order — go off-script and you're lost
- The same content can't flex between a 2-minute pitch and a 30-minute deep dive

## How It Works

### 1. Upload Your Materials
Drop in PDFs, PowerPoints, text files, or markdown. FlowDeck extracts and understands your content using `pypdf` and `python-pptx`.

### 2. Chat & Generate
Chat with the AI to refine context, correct misunderstandings, and add anything the docs don't cover. When ready, hit **Generate Presentation** to run the two-stage agent pipeline:

- **Ingredient Agent** — reads all your context and extracts the key message, supporting points, narrative hooks, and topic tags
- **Creation Agent** — turns those structured ingredients into a complete slide deck (title, concept, comparison, timeline, evidence, and conclusion slides)

### 3. Explore the Slide Graph
After generation, the **slide graph view** visualizes trigger-word paths between slides as a circular node graph with curved arrows. Click any node to preview the slide, edit its content, or start presenting from that point.

### 4. Present — Just Talk
Go live. FlowDeck listens to your speech and matches it against your slide pool in real time. Mention "revenue" and the revenue slide appears. Say "team" and the team slide shows up. A 2-minute version might show 5 slides; a 30-minute version of the same deck shows 25 — same pool, different path determined by what you actually say.

---

## Tech Stack

| Tool | How We Used It |
|------|---------------|
| **[assistant-ui](https://github.com/assistant-ui/assistant-ui)** | Powers the entire chat interface. `@assistant-ui/react-ui` provides the `<Thread>` component with streaming message rendering, file attachment UI (drag-and-drop + paperclip button), and markdown formatting via `@assistant-ui/react-markdown`. Connected to the backend via `useChatRuntime` from `@assistant-ui/react-ai-sdk`. |
| **[Railtracks](https://railtracks.ai)** | Agent framework for the two-stage slide generation pipeline. `ingredient_agent` uses `rt.agent_node` + `rt.function_node` to extract structured content ingredients; `creation_agent` transforms them into slide JSON. `rt.call()` chains the two agents with automatic Session management — no manual lifecycle code needed. |
| **[OpenAI GPT-4o](https://openai.com)** | LLM powering the chat conversation (streamed SSE) and both Railtracks agents for ingredient extraction and slide creation. |
| **[Deepgram](https://deepgram.com)** | Real-time speech-to-text transcription for voice-driven slide navigation during live presentations. |
| **[Vercel AI SDK](https://sdk.vercel.ai)** | `useChatRuntime` manages streaming chat state; `threadMessagesForGenerate` serializes the full thread (including file attachments) into the multimodal generate payload sent to the backend. |
| **[FastAPI](https://fastapi.tiangolo.com)** | Python backend serving `/api/chat` (streaming SSE via GPT-4o), `/api/generate` (two-agent slide pipeline), and `/api/export/pptx` (PPTX file download). |
| **[Next.js 16 + React 19](https://nextjs.org)** | Frontend with App Router. API routes at `/api/chat`, `/api/generate`, and `/api/export/pptx` proxy to the FastAPI backend. |
| **[Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)** | Browser-native continuous speech recognition for slide navigation. Matches spoken words against each slide's `trigger_words` to jump directly to the relevant slide. |
| **[pypdf](https://pypdf.readthedocs.io) + [python-pptx](https://python-pptx.readthedocs.io)** | File ingestion in `thread_context.py` — `extract_pdf_text()` and `extract_pptx_text()` pull text from uploaded files before passing everything to the AI. Also used for PPTX export. |
| **[Augment Code](https://www.augmentcode.com)** | AI coding assistant used throughout development for code generation, debugging, and architectural decisions. |
| **[Tailwind CSS v4](https://tailwindcss.com)** | Dark-first UI styling throughout the app. |

---

## Architecture

```
Chat Phase
  Browser ←→ Next.js /api/chat ←→ FastAPI /api/chat
               (streaming SSE)        (GPT-4o stream)

File Upload
  Browser → assistant-ui file picker → thread state
    → threadMessagesForGenerate() → included in generate payload
    → FastAPI thread_context.py → extract_pdf_text() / extract_pptx_text()
    → full context passed to both Railtracks agents

Slide Generation (Two-Agent Pipeline via Railtracks)
  threadMessagesForGenerate() → POST /api/generate
    → compile_messages_for_slide_generation()   # thread_context.py
    → rt.call(IngredientAgent, content)          # GPT-4o: extract key_message,
    │                                            #   supporting_points, hooks, tags
    → rt.call(CreationAgent, ingredients_json)   # GPT-4o: produce slide JSON array
    → Pydantic validation → { slides: [...] }

Slide Graph View
  slides[] → slideTriggerGraph.ts   # compute edges from trigger_words
           → SlideGraphView.tsx     # SVG circle layout, curved bezier arrows
           → click node → inline preview + edit + "Present from here"

Presentation Mode
  Browser mic → Web Speech API → continuous transcription
  trigger words matched → PresentMode.tsx shows matching slide
  keyboard nav (arrow keys / spacebar) + speaker notes overlay

Export
  slides[] → POST /api/export/pptx → python-pptx → .pptx file download
```

---

## Getting Started

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` with your OpenAI key (required for real generation):

```env
OPENAI_API_KEY=sk-...
```

Start the API (default port 8000):

```bash
python main.py
```

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Mock mode**: If `OPENAI_API_KEY` is not set, the app runs with hardcoded sample data so you can explore the full UI without an API key.
