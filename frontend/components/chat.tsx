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
            "What would you like to present? Describe your topic, paste notes, or upload a file — SlideForge will turn your ideas into a polished presentation.",
        },
        composer: {
          input: { placeholder: "Describe your presentation topic…" },
        },
      },
      welcome: {
        suggestions: [
          {
            text: "Pitch deck for a new product",
            prompt:
              "Help me outline a pitch deck for a new consumer product. Ask clarifying questions if needed.",
          },
          {
            text: "Quarterly business review",
            prompt:
              "Structure slides for a quarterly business review for my team.",
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
