import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatCompletionStream = AsyncIterable<string>;

export type ChatCompletionMessage = ChatCompletionMessageParam;

export interface ChatCompletionCreateOptions<T = any> {
  model: T | (string & {});
  systemRole: string;
  stream: boolean;
  history: ChatCompletionMessage[];
}

export interface ChatCompletions {
  getModels(): string[];

  create<T extends ChatCompletionCreateOptions & { [K: string]: any }>(
    prompt: string,
    options?: Partial<T>,
  ): Promise<T extends { stream: true } ? ChatCompletionStream : string>;

  handleStream(stream: ChatCompletionStream, onChunk?: (chunk: string) => Promise<void> | void): Promise<string>;
}
