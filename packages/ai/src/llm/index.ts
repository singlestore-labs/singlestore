import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatCompletionStream = AsyncIterable<string>;

export type ChatCompletionMessage = ChatCompletionMessageParam;

export type ChatCompletionOptions = {
  systemRole?: string;
  stream?: boolean;
  history?: ChatCompletionMessage[];
};

export interface LLM {
  createChatCompletion<T extends ChatCompletionOptions & { [K: string]: any }>(
    prompt: string,
    options?: T,
  ): Promise<T extends { stream: true } ? ChatCompletionStream : string>;

  handleChatCompleitonStream(stream: ChatCompletionStream, onChunk?: (chunk: string) => Promise<void> | void): Promise<string>;
}
