import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatCompletionStream = AsyncIterable<string>;
export type ChatCompletionMessage = ChatCompletionMessageParam;

export interface ChatCompletionCreateOptions<T = any> {
  model: T | (string & {});
  systemRole: string;
  stream: boolean;
  history: ChatCompletionMessage[];
}

export type ChatCompletionCreateReturnType<T = any> = T extends { stream: true } ? ChatCompletionStream : string;

export interface ChatCompletions {
  getModels(): string[];

  create<T extends Partial<ChatCompletionCreateOptions>>(
    prompt: string,
    options?: T,
  ): Promise<ChatCompletionCreateReturnType<T>>;

  handleStream(stream: ChatCompletionStream, onChunk?: (chunk: string) => Promise<void> | void): Promise<string>;
}
