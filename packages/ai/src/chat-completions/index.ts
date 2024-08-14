import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatCompletionPrompt = string;
export type ChatCompletionModel = string;
export type ChatCompletionChunk = string;
export type ChatCompletionStream = AsyncGenerator<ChatCompletionChunk>;
export type ChatCompletionMessage = ChatCompletionMessageParam;

export interface CreateChatCompletionOptions<T = any> {
  model: T | (string & {});
  systemRole: string;
  stream: boolean;
  history: ChatCompletionMessage[];
}
export type CreateChatCompletionResult<T = any> = T extends { stream: true } ? ChatCompletionStream : string;

export type OnChatCompletionStreamChunk = (chunk: ChatCompletionChunk) => Promise<void> | void;

export interface ChatCompletions {
  getModels(): ChatCompletionModel[];

  create<T extends Partial<CreateChatCompletionOptions>>(
    prompt: ChatCompletionPrompt,
    options?: T,
  ): Promise<CreateChatCompletionResult<T>>;

  handleStream(stream: ChatCompletionStream, onChunk?: OnChatCompletionStreamChunk): Promise<string>;
}
