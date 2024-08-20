import type { AnyChatCompletionTool } from "./tool";
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

export interface CreateChatCompletionParams {
  prompt?: string;
  model?: string;
  systemRole?: string;
  stream?: boolean;
  messages?: ChatCompletionMessage[];
  tools?: AnyChatCompletionTool[];
}

export type CreateChatCompletionResult<T extends boolean | undefined> = T extends true ? ChatCompletionStream : ChatCompletion;

export abstract class ChatCompletions<T extends AnyChatCompletionTool[] | undefined> {
  tools = undefined as T;

  initTools(tools: T) {
    this.tools = tools;
  }

  abstract getModels(): Promise<string[]> | string[];

  async handleStream(stream: ChatCompletionStream, onChunk?: OnChatCompletionChunk): Promise<ChatCompletion> {
    let completion: ChatCompletion = { content: "" };

    for await (const chunk of stream) {
      completion = { ...completion, ...chunk, content: `${completion.content}${chunk.content}` };
      await onChunk?.(chunk);
    }

    return completion;
  }

  abstract create(params: CreateChatCompletionParams): Promise<CreateChatCompletionResult<any>>;
}
