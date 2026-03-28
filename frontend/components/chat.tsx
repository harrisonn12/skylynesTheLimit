"use client";

import { Thread, makeMarkdownText } from "@assistant-ui/react-ui";
import { useThreadRuntime } from "@assistant-ui/react";
import { useEffect, useMemo, useRef } from "react";

interface ChatProps {
  onMessagesChange?: (hasMessages: boolean) => void;
}

export function Chat({ onMessagesChange }: ChatProps) {
  const threadRuntime = useThreadRuntime();
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (!onMessagesChange) return;
    return threadRuntime.subscribe(() => {
      const messages = threadRuntime.getState().messages;
      const len = messages.length;
      if (len !== prevLengthRef.current) {
        prevLengthRef.current = len;
        onMessagesChange(len > 0);
      }
    });
  }, [threadRuntime, onMessagesChange]);

  const MarkdownText = useMemo(() => makeMarkdownText(), []);

  const threadConfig = useMemo(
    () => ({
      assistantAvatar: { fallback: "SF" },
      strings: {
        welcome: {
          message:
            "Describe your slide deck or topic — I'll ask a few clarifying questions as we go. Drag files onto the box below or use the paperclip to attach outlines, decks, or notes.",
        },
        composer: {
          input: {
            placeholder:
              "Describe your deck, paste notes, or drag files here…",
          },
          addAttachment: {
            tooltip: "Attach files (or drag & drop into the composer)",
          },
        },
      },
      welcome: {
        suggestions: [
          {
            text: "Pitch deck for a new product",
            prompt:
              "I need a pitch deck for a new consumer product. Walk me through clarifying questions (audience, story, proof points), and remind me I can drag in files if I have a brief or draft.",
          },
          {
            text: "Quarterly business review",
            prompt:
              "I'm planning a quarterly business review for my team. Ask me focused questions to shape the deck, and mention drag-and-drop if I have spreadsheets or last quarter's slides.",
          },
        ],
      },
      assistantMessage: {
        components: {
          Text: MarkdownText,
        },
      },
    }),
    [MarkdownText],
  );

  return (
    <div className="aui-root flex h-full min-h-0 flex-1 flex-col">
      <Thread {...threadConfig} />
    </div>
  );
}
