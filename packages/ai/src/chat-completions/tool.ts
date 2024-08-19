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
  schema?: U;
  call: K;
}

export type AnyChatCompletionTool = ChatCompletionTool<
  string,
  z.AnyZodObject | undefined,
  ChatCompletionToolCall<string, any | undefined, any> // TODO: Fix the z.AnyZodObject | undefined type
>;

export class ChatCompletionTool<
  T extends string,
  U extends z.AnyZodObject | undefined,
  K extends ChatCompletionToolCall<T, U, any>,
> {
  name: T;
  description: string;
  schema: U;
  call: K;

  constructor(config: ChatCompletionToolConfig<T, U, K>) {
    this.name = config.name;
    this.description = config.description;
    this.schema = config.schema as U;
    this.call = config.call;
  }
}
