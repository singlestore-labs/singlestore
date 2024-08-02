import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatCompletionStream = AsyncIterable<string>;

export interface LLM {
  createChatCompletion<
    T extends {
      systemRole?: string;
      stream?: boolean;
      history?: ChatCompletionMessageParam[];
      [K: string]: any;
    },
  >(
    prompt: string,
    options?: T,
  ): Promise<T extends { stream: true } ? ChatCompletionStream : string>;

  handleChatCompleitonStream(stream: ChatCompletionStream, onChunk?: (chunk: string) => Promise<void> | void): Promise<string>;
}
