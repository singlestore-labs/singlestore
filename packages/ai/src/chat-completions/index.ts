import type { ChatCompletionTool } from "./tool";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatCompletionType = "message" | "tool";

export interface ChatCompletion {
  type: ChatCompletionType;
  content: string;
}

export type ChatCompletionStream = AsyncGenerator<ChatCompletion>;

export interface ChatCompletionMessage {
  role: ChatCompletionMessageParam["role"];
  content: string;
}

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
  : ChatCompletion;

export type OnChatCompletionStreamChunk = (chunk: ChatCompletion) => Promise<void> | void;

export type ChatCompletionTools = ChatCompletionTool[] | undefined;

export abstract class ChatCompletions<T extends ChatCompletionTools = ChatCompletionTools> {
  tools = undefined as T extends ChatCompletionTool[] ? T : undefined;

  set setTools(tools: T) {
    this.tools = tools as this["tools"];
  }

  abstract getModels(): Promise<string[]> | string[];

  async handleStream(stream: ChatCompletionStream, onChunk?: OnChatCompletionStreamChunk): Promise<ChatCompletion> {
    let completion: ChatCompletion = { type: "message", content: "" };

    for await (const chunk of stream) {
      completion = { ...completion, ...chunk, content: `${completion.content}${chunk.content}` };
      await onChunk?.(chunk);
    }

    return completion;
  }

  abstract create(prompt: string, options?: CreateChatCompletionOptions): Promise<CreateChatCompletionResult>;
}
