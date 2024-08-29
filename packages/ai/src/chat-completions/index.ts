import z from "zod";

import type { AnyChatCompletionTool } from "./tool";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * Represents a single chat completion with the generated content.
 *
 * @interface ChatCompletion
 * @property {string} content - The generated content of the chat completion.
 */
export interface ChatCompletion {
  content: string;
}

/**
 * Represents a stream of chat completions, which can be asynchronously generated.
 * The stream yields `ChatCompletion` objects.
 *
 * @typedef {AsyncGenerator<ChatCompletion>} ChatCompletionStream
 */
export type ChatCompletionStream = AsyncGenerator<ChatCompletion>;

/**
 * Callback function type for handling individual chunks of a chat completion stream.
 *
 * @callback OnChatCompletionChunk
 * @param {ChatCompletion} chunk - A chunk of chat completion content.
 * @returns {Promise<void> | void} A Promise that resolves when the chunk is processed, or void if no async operation is needed.
 */
export type OnChatCompletionChunk = (chunk: ChatCompletion) => Promise<void> | void;

/**
 * Represents a message in a chat completion, including the role (system, assistant, user) and content.
 *
 * @interface ChatCompletionMessage
 * @property {"system" | "assistant" | "user"} role - The role in the conversation, can be "system", "assistant", or "user".
 * @property {string | null} content - The content of the message, or null if no content is available.
 */
export interface ChatCompletionMessage {
  role: Extract<ChatCompletionMessageParam["role"], "system" | "assistant" | "user">;
  content: string | null;
}

/**
 * Parameters for creating a chat completion.
 *
 * @typeParam TStream - Indicates whether the completion should be streamed (boolean).
 * @typeParam TChatCompletionTool - An array of tools that can be used during the chat completion.
 *
 * @interface CreateChatCompletionParams
 * @property {string} [prompt] - The initial prompt to generate the chat completion.
 * @property {string} [model] - The model to use for generating the completion.
 * @property {string} [systemRole] - The role of the system in the conversation.
 * @property {TStream} [stream] - Whether the completion should be streamed.
 * @property {ChatCompletionMessage[]} [messages] - An array of previous messages in the conversation.
 * @property {TChatCompletionTool} [tools] - An array of tools that can be used during the completion.
 * @property {Record<string, (tool: AnyChatCompletionTool, params: any) => Promise<void>>} [toolCallHandlers] - Optional handlers for when a tool is called during the completion.
 * @property {Record<string, (tool: AnyChatCompletionTool, result: any, params: any) => Promise<void>>} [toolCallResultHandlers] - Optional handlers for when a tool returns a result during the completion.
 */
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

/**
 * The result of creating a chat completion.
 *
 * @typeParam TStream - Indicates whether the result is a stream or a single completion.
 *
 * @typedef {TStream extends true ? ChatCompletionStream : ChatCompletion} CreateChatCompletionResult
 * @returns {ChatCompletionStream | ChatCompletion} If TStream is true, returns a `ChatCompletionStream`, otherwise returns a single `ChatCompletion`.
 */
export type CreateChatCompletionResult<TStream extends boolean | undefined> = TStream extends true
  ? ChatCompletionStream
  : ChatCompletion;

/**
 * Abstract class representing a chat completions generator, capable of handling various tools.
 *
 * This class defines the interface for generating chat completions, allowing for integration with multiple tools.
 *
 * @abstract
 * @class ChatCompletions
 * @typeParam TChatCompletionTool - An array of tools that can be used during the chat completion.
 */
export abstract class ChatCompletions<TChatCompletionTool extends AnyChatCompletionTool[] | undefined> {
  /**
   * The tools that can be used during chat completion. Initialized to undefined.
   *
   * @type {TChatCompletionTool}
   */
  tools = undefined as TChatCompletionTool;

  /**
   * Initializes the tools to be used in chat completion.
   *
   * @param {TChatCompletionTool} tools - An array of tools to be used in the chat completion.
   */
  initTools(tools: TChatCompletionTool) {
    this.tools = tools;
  }

  /**
   * Retrieves the models available for generating chat completions.
   *
   * @abstract
   * @returns {Promise<string[]> | string[]} A promise that resolves to an array of model names or an array of model names directly.
   */
  abstract getModels(): Promise<string[]> | string[];

  /**
   * Handles a stream of chat completions, optionally processing each chunk.
   *
   * @param {ChatCompletionStream} stream - The stream of chat completions.
   * @param {OnChatCompletionChunk} [onChunk] - Optional callback function to handle each chunk as it is received.
   * @returns {Promise<ChatCompletion>} A promise that resolves to the final chat completion, with all chunks combined.
   */
  async handleStream(stream: ChatCompletionStream, onChunk?: OnChatCompletionChunk): Promise<ChatCompletion> {
    let completion: ChatCompletion = { content: "" };

    for await (const chunk of stream) {
      completion = { ...completion, ...chunk, content: `${completion.content}${chunk.content}` };
      await onChunk?.(chunk);
    }

    return completion;
  }

  /**
   * Creates a chat completion based on the provided parameters.
   *
   * @abstract
   * @param {CreateChatCompletionParams<any, any>} params - Parameters for creating the chat completion, including the prompt, model, messages, tools, and handlers.
   * @returns {Promise<CreateChatCompletionResult<any>>} A promise that resolves to either a single chat completion or a stream of chat completions, depending on the `stream` parameter.
   */
  abstract create(params: CreateChatCompletionParams<any, any>): Promise<CreateChatCompletionResult<any>>;
}
