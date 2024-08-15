import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatCompletionChunk = string;
export type ChatCompletionStream = AsyncGenerator<ChatCompletionChunk>;
export type ChatCompletionMessage = { role: ChatCompletionMessageParam["role"]; content: string };

export interface CreateChatCompletionOptions {
  model?: string;
  systemRole?: string;
  stream?: boolean;
  messages?: ChatCompletionMessage[];
}

export type CreateChatCompletionResult<T extends CreateChatCompletionOptions = CreateChatCompletionOptions> = T extends {
  stream: true;
}
  ? ChatCompletionStream
  : string;

export type OnChatCompletionStreamChunk = (chunk: ChatCompletionChunk) => Promise<void> | void;

export abstract class ChatCompletions {
  abstract getModels(): Promise<string[]> | string[];

  async handleStream(stream: ChatCompletionStream, onChunk?: OnChatCompletionStreamChunk): Promise<string> {
    let text = "";

    for await (const chunk of stream) {
      text += chunk;
      await onChunk?.(chunk);
    }

    return text;
  }

  abstract create(prompt: string, options?: CreateChatCompletionOptions): Promise<CreateChatCompletionResult>;
}
