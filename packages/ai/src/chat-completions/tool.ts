import { z } from "zod";

export type ChatCompletionToolCall<T extends string, U extends z.AnyZodObject | undefined, K> = (
  params: U extends z.AnyZodObject ? z.infer<U> : void,
) => Promise<{ name: T; value: K; params?: U extends z.AnyZodObject ? z.infer<U> : undefined }>;

interface ChatCompletionToolConfig<
  T extends string,
  U extends z.AnyZodObject | undefined,
  K extends ChatCompletionToolCall<T, U, any>,
> {
  name: T;
  description: string;
  params?: U;
  call: K;
}

export type AnyChatCompletionTool = ChatCompletionTool<
  string,
  z.AnyZodObject | undefined,
  ChatCompletionToolCall<string, any | undefined, any>
>;

export type MergeChatCompletionTools<
  T extends AnyChatCompletionTool[] | undefined,
  U extends AnyChatCompletionTool[] | undefined,
> = T extends AnyChatCompletionTool[]
  ? U extends AnyChatCompletionTool[]
    ? [...T, ...U]
    : T
  : U extends AnyChatCompletionTool[]
    ? U
    : undefined;

export class ChatCompletionTool<
  T extends string,
  U extends z.AnyZodObject | undefined,
  K extends ChatCompletionToolCall<T, U, any>,
> {
  name: T;
  description: string;
  params: U;
  call: K;

  constructor(config: ChatCompletionToolConfig<T, U, K>) {
    this.name = config.name;
    this.description = config.description;
    this.params = config.params as U;
    this.call = config.call;
  }
}
