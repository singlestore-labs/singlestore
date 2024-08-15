import type z from "zod";

export interface ChatCompletionToolCallResult {}

export type ChatCompletionToolCall<T extends z.AnyZodObject = z.AnyZodObject> = (
  values: z.infer<T>,
) => Promise<ChatCompletionToolCallResult>;

export class ChatCompletionTool<
  T extends z.AnyZodObject = z.AnyZodObject,
  U extends ChatCompletionToolCall<T> = ChatCompletionToolCall<T>,
> {
  constructor(
    public name: string,
    public description: string,
    public schema: T,
    public call: U,
  ) {}
}
