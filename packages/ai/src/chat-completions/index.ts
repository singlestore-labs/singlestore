import z from "zod";

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

export interface CreateChatCompletionParams<T extends boolean | undefined, U extends AnyChatCompletionTool[] | undefined> {
  prompt?: string;
  model?: string;
  systemRole?: string;
  stream?: T;
  messages?: ChatCompletionMessage[];
  tools?: U;

  toolCallHandlers?: U extends AnyChatCompletionTool[]
    ? {
        [K in U[number] as K["name"]]?: (
          tool: K,
          params: K["params"] extends z.AnyZodObject ? z.infer<K["params"]> : undefined,
        ) => Promise<void>;
      }
    : undefined;

  toolCallResultHandlers?: U extends AnyChatCompletionTool[]
    ? {
        [K in U[number] as K["name"]]?: (
          tool: K,
          result: Awaited<ReturnType<K["call"]>>,
          params: K["params"] extends z.AnyZodObject ? z.infer<K["params"]> : undefined,
        ) => Promise<void>;
      }
    : undefined;
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

  abstract create(params: CreateChatCompletionParams<any, any>): Promise<CreateChatCompletionResult<any>>;
}
