import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

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
  ): Promise<T extends { stream: true } ? AsyncIterable<string> : string>;

  handleChatCompleitonStream(stream: AsyncIterable<string>, onChunk?: (chunk: string) => Promise<void> | void): Promise<string>;
}
