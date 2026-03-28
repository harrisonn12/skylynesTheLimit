"use client";

import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  useThreadRuntime,
} from "@assistant-ui/react";
import { useEffect, useRef } from "react";

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

  return (
    <div className="flex h-full flex-col">
      {/* Thread */}
      <ThreadPrimitive.Root className="flex flex-1 flex-col overflow-hidden">
        <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto">
          <ThreadPrimitive.Empty>
            <div className="flex h-full items-center justify-center">
              <div className="max-w-lg text-center px-6">
                <div className="mb-6 mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                  </svg>
                </div>
                <h2 className="mb-3 text-2xl font-bold text-zinc-100">
                  What would you like to present?
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Describe your topic, paste notes, or upload a file. SlideForge will turn your ideas into a polished presentation.
                </p>
              </div>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </ThreadPrimitive.Viewport>

        {/* Composer */}
        <div className="border-t border-zinc-800 p-4">
          <ComposerPrimitive.Root className="flex items-end gap-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2 focus-within:border-zinc-500 transition-colors">
            <ComposerPrimitive.AddAttachment className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
              <PaperclipIcon />
            </ComposerPrimitive.AddAttachment>
            <ComposerPrimitive.Input
              placeholder="Describe your presentation topic..."
              className="min-h-[36px] flex-1 resize-none bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              autoFocus
            />
            <ComposerPrimitive.Send className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 transition-colors">
              <SendIcon />
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </div>
      </ThreadPrimitive.Root>
    </div>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end px-4 py-2">
      <div className="max-w-[80%] rounded-2xl bg-blue-600 px-4 py-2.5 text-sm text-white">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start px-4 py-2">
      <div className="max-w-[80%] rounded-2xl bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
