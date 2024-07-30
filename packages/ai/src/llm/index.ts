import type { Stream } from "openai/streaming";
import type { ChatCompletionChunk } from "openai/resources/chat/index";

export { Stream } from "openai/streaming";
export type { ChatCompletionChunk } from "openai/resources/chat/index";

export interface LLM {
  createChatCompletion(input: string, options?: Record<string, any>): Promise<Stream<ChatCompletionChunk>>;
}
