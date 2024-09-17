import z from "zod";

import type { ChatCompletion, ChatCompletionMessage, ChatCompletionStream, OnChatCompletionChunk } from "./chat-completion";
import type { AnyChatCompletionTool } from "./tool";

export interface CreateChatCompletionParams<
  TStream extends boolean | undefined,
  TChatCompletionTool extends AnyChatCompletionTool[] | undefined,
> {
  prompt?: string;
  model?: string;
  systemRole?: string;
  stream?: TStream;
  messages?: ChatCompletionMessage[];
  tools?: TChatCompletionTool;

  toolCallHandlers?: TChatCompletionTool extends AnyChatCompletionTool[]
    ? {
        [K in TChatCompletionTool[number] as K["name"]]?: (
          tool: K,
          params: K["params"] extends z.AnyZodObject ? z.infer<K["params"]> : undefined,
        ) => Promise<void>;
      }
    : undefined;

  toolCallResultHandlers?: TChatCompletionTool extends AnyChatCompletionTool[]
    ? {
        [K in TChatCompletionTool[number] as K["name"]]?: (
          tool: K,
          result: Awaited<ReturnType<K["call"]>>,
          params: K["params"] extends z.AnyZodObject ? z.infer<K["params"]> : undefined,
        ) => Promise<void>;
      }
    : undefined;
}

export type CreateChatCompletionResult<TStream extends boolean | undefined> = TStream extends true
  ? ChatCompletionStream
  : ChatCompletion;

export abstract class ChatCompletionsManager<TChatCompletionTool extends AnyChatCompletionTool[] | undefined> {
  tools = undefined as TChatCompletionTool;

  initTools(tools: TChatCompletionTool) {
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
