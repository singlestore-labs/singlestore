import { z } from "zod";

/**
 * Represents the function signature for a ChatCompletionTool's `call` method.
 * This method is responsible for executing the tool's primary logic.
 *
 * @typeParam T - The name of the tool, represented as a string literal type.
 * @typeParam U - A Zod object schema or undefined, representing the parameters the tool requires.
 *                If undefined, no parameters are expected.
 * @typeParam K - The return type of the `call` function, representing the value produced by the tool.
 *
 * @param params - The parameters passed to the tool, inferred from the Zod schema `U` if provided.
 *                 If `U` is undefined, this parameter is void.
 *
 * @returns A Promise that resolves to an object containing the tool's name, the result value, and optionally the parameters.
 */
export type ChatCompletionToolCall<T extends string, U extends z.AnyZodObject | undefined, K> = (
  params: U extends z.AnyZodObject ? z.infer<U> : void,
) => Promise<{ name: T; value: K; params?: U extends z.AnyZodObject ? z.infer<U> : undefined }>;

/**
 * Configuration object for initializing a ChatCompletionTool.
 *
 * @typeParam T - The name of the tool, represented as a string literal type.
 * @typeParam U - A Zod object schema or undefined, representing the parameters the tool requires.
 * @typeParam K - The function signature for the tool's `call` method.
 *
 * @property {T} name - The unique name of the tool.
 * @property {string} description - A description of the tool's functionality.
 * @property {U} [params] - Optional Zod schema defining the parameters for the tool.
 * @property {K} call - The function that implements the tool's primary logic.
 */
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

/**
 * Represents any ChatCompletionTool with generic types for name, parameters, and call signature.
 * This type is useful for handling tools in a generic context.
 *
 * @typeParam T - The name of the tool, represented as a string.
 * @typeParam U - A Zod object schema or undefined, representing the parameters the tool requires.
 * @typeParam K - The function signature for the tool's `call` method.
 */
export type AnyChatCompletionTool = ChatCompletionTool<
  string,
  z.AnyZodObject | undefined,
  ChatCompletionToolCall<string, any | undefined, any> // TODO: Fix the z.AnyZodObject | undefined type
>;

/**
 * Merges two arrays of ChatCompletionTools, preserving their types.
 *
 * @typeParam T - An array of ChatCompletionTools or undefined.
 * @typeParam U - Another array of ChatCompletionTools or undefined.
 *
 * @returns An array containing all tools from both input arrays, or undefined if both inputs are undefined.
 */
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

/**
 * Represents a tool used in chat completions, encapsulating a name, description, optional parameters, and a call function.
 *
 * @typeParam T - The name of the tool, represented as a string literal type.
 * @typeParam U - A Zod object schema or undefined, representing the parameters the tool requires.
 * @typeParam K - The function signature for the tool's `call` method.
 */
export class ChatCompletionTool<
  T extends string,
  U extends z.AnyZodObject | undefined,
  K extends ChatCompletionToolCall<T, U, any>,
> {
  name: T;
  description: string;
  params: U;
  call: K;

  /**
   * Constructs a new ChatCompletionTool instance.
   *
   * @param {ChatCompletionToolConfig<T, U, K>} config - Configuration object for initializing the tool.
   */
  constructor(config: ChatCompletionToolConfig<T, U, K>) {
    this.name = config.name;
    this.description = config.description;
    this.params = config.params as U;
    this.call = config.call;
  }
}
