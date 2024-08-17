import { z } from "zod";

export type ChatCompletionToolSchema = z.AnyZodObject | undefined;

export type ChatCompletionToolCallResult<T extends string, U extends ChatCompletionToolSchema, V> = U extends z.AnyZodObject
  ? { name: T; params: z.infer<U>; value: V }
  : { name: T; value: V };

export type ChatCompletionToolCall<T extends string, U extends ChatCompletionToolSchema, V> = (
  params: U extends z.AnyZodObject ? z.infer<U> : undefined,
) => Promise<ChatCompletionToolCallResult<T, U, V>>;

type ChatCompletionToolConfig<T extends string, U extends ChatCompletionToolSchema, V> = {
  name: T;
  description: string;
  schema?: U;
  call: ChatCompletionToolCall<T, U, V>;
};

export class ChatCompletionTool<
  T extends string = string,
  U extends ChatCompletionToolSchema = ChatCompletionToolSchema,
  V = any,
> {
  name: T;
  description: string;
  schema?: U;
  call: ChatCompletionToolCall<T, U, V>;

  constructor(config: ChatCompletionToolConfig<T, U, V>) {
    this.name = config.name;
    this.description = config.description;
    this.schema = config.schema;
    this.call = config.call;
  }
}
