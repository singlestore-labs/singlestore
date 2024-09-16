import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface ChatCompletion {
  content: string;
}

export type ChatCompletionStream = AsyncGenerator<ChatCompletion>;

export type OnChatCompletionChunk = (chunk: ChatCompletion) => Promise<void> | void;

export interface ChatCompletionMessage {
  role: Extract<ChatCompletionMessageParam["role"], "system" | "assistant" | "user">;
  content: string | null;
}
