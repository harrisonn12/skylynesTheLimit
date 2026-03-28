# FlowDeck — Project Overview

## What is FlowDeck?

FlowDeck is an AI-powered presentation engine that replaces traditional slide decks. Instead of building slides manually and clicking through them in order, you upload your materials, the AI generates a comprehensive library of slides, and then during your live talk it listens to what you're saying and automatically shows the right slide.

## The Problem We're Solving

- Making slide decks takes hours
- Presenters are locked into a fixed slide order — go off-script and you're lost
- The same content can't flex between a 2-minute pitch and a 30-minute deep dive
- Slide data goes stale the moment you export

## How It Works

### Step 1: Upload Your Materials
Drop in any docs — PDFs, markdown, text files, CSVs. The AI reads everything and builds a knowledge base about your topic.

### Step 2: Review with AI
Chat with the AI about what it understood. Add context the docs don't cover. Correct any misunderstandings. Then generate a slide pool — a library of 20-40+ slides covering your topic from every angle.

### Step 3: Configure Your Talk
Before each specific presentation, set the basics via a quick form: who's the audience, how long is the talk, what style do you want. These settings help the AI know which slides to prioritize.

### Step 4: Present — Just Talk
Go live. The AI listens to your speech in real time using Deepgram transcription, matches what you're saying against the slide pool, and surfaces the right slide automatically. Talk about revenue — the revenue slide appears. Mention the team — team slide shows up.

A 2-minute version might show 5 slides. A 30-minute version of the same deck shows 25. Same pool, different path — determined by what you actually say.

### Step 5: Self-Improvement
After each presentation, the AI reviews what happened:
- Identifies topics you discussed that had no matching slide (coverage gaps)
- Learns your vocabulary so it matches slides better next time
- Flags slides that never get used across multiple presentations
- Suggests new slides to fill gaps

Every presentation makes the next one better.

## Key Features

- **No fixed slide order** — slides are a library, not a sequence
- **Voice-driven navigation** — just talk, the right slide appears
- **Live data slides** — slides can show real-time metrics, live transcript, API data
- **Self-improving** — the agent learns from each presentation
- **Multi-length support** — same slide pool works for any talk length

## Tech Stack

- **DigitalOcean Gradient** — LLM inference (llama3.3-70b-instruct) for all AI agents
- **Railtracks** — Agent framework powering the materials review agent, interview agent, slide generator, and post-presentation review agent
- **Deepgram** — Real-time speech-to-text transcription
- **React + Vite** — Frontend with fullscreen slide renderer
- **FastAPI + WebSocket** — Backend with real-time communication
- **Assistant UI** — Chat interface components

## Architecture

```
Upload Phase:
  Browser → File Upload → Backend stores materials

Review Phase:
  Browser ←→ Chat ←→ Materials Review Agent (Railtracks) ←→ LLM (DO Gradient)

Slide Generation:
  Materials + Context → Slide Generator Agent → Slide Pool (persisted)

Live Presentation:
  Mic → Browser → WebSocket → Deepgram (speech-to-text)
    → Orchestrator (keyword matching against slide pool)
    → WebSocket → Browser (slide displayed)

Self-Improvement:
  Presentation log → Review Agent → Coverage gaps + keyword updates + new slide suggestions
```

## What Makes It Special

1. **Multimodal** — Audio input (speech), visual output (slides), text (document ingestion), live data (API integrations)
2. **Self-improving** — Every presentation generates measurable feedback that improves the next one
3. **Real-time** — Sub-second slide switching based on live speech
4. **Flexible** — Same content works for any audience, any length, any style
