"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Chat } from "@/components/chat";
import { useMemo } from "react";

export default function Home() {
  const transport = useMemo(() => new AssistantChatTransport({ api: "/api/chat" }), []);
  const runtime = useChatRuntime({ transport });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="h-dvh bg-zinc-950">
        <Chat />
      </main>
    </AssistantRuntimeProvider>
  );
}
