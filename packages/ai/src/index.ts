import { OpenAI } from "openai";

import { ChatCompletions } from "./chat-completions";
import { OpenAIChatCompletions } from "./chat-completions/openai";
import { AnyChatCompletionTool, ChatCompletionTool } from "./chat-completions/tool";
import { Embeddings } from "./embeddings";
import { OpenAIEmbeddings } from "./embeddings/openai";

export type * from "./types";
export { Embeddings, ChatCompletions, ChatCompletionTool };

/**
 * Configuration object for initializing the `AI` class.
 *
 * @typeParam T - The type of `Embeddings` to be used, defaulting to `OpenAIEmbeddings`.
 * @typeParam U - An array of tools that can be used during chat completions, or undefined.
 * @typeParam K - The type of `ChatCompletions` to be used, defaulting to `OpenAIChatCompletions`.
 *
 * @property {string} [openAIApiKey] - The API key for authenticating with the OpenAI API.
 * @property {T} [embeddings] - An instance of `Embeddings` used for generating embeddings. Defaults to `OpenAIEmbeddings`.
 * @property {K} [chatCompletions] - An instance of `ChatCompletions` used for generating chat completions. Defaults to `OpenAIChatCompletions`.
 * @property {U} [chatCompletionTools] - An optional array of tools that can be used during chat completions.
 */
export interface AIConfig<T extends Embeddings, U extends AnyChatCompletionTool[] | undefined, K extends ChatCompletions<U>> {
  openAIApiKey?: string;
  embeddings?: T;
  chatCompletions?: K;
  chatCompletionTools?: U;
}

/**
 * Represents any `AI` instance with generic types for embeddings, tools, and chat completions.
 * This type is useful for handling `AI` instances in a generic context.
 */
export type AnyAI = AI<Embeddings, AnyChatCompletionTool[] | undefined, ChatCompletions<any>>;

/**
 * Main class for handling AI operations, including embeddings and chat completions.
 *
 * @typeParam T - The type of `Embeddings` to be used, defaulting to `OpenAIEmbeddings`.
 * @typeParam U - An array of tools that can be used during chat completions, or undefined.
 * @typeParam K - The type of `ChatCompletions` to be used, defaulting to `OpenAIChatCompletions`.
 *
 * @property {T} embeddings - An instance of `Embeddings` used for generating embeddings.
 * @property {K} chatCompletions - An instance of `ChatCompletions` used for generating chat completions.
 */
export class AI<
  T extends Embeddings = OpenAIEmbeddings,
  U extends AnyChatCompletionTool[] | undefined = undefined,
  K extends ChatCompletions<any> = OpenAIChatCompletions<U>,
> {
  embeddings: T;
  chatCompletions: K;

  /**
   * Constructs a new `AI` instance.
   *
   * @param {AIConfig<T, U, K>} config - The configuration object for initializing the `AI` instance.
   */
  constructor(config: AIConfig<T, U, K>) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    // Initialize embeddings, defaulting to OpenAIEmbeddings if not provided
    this.embeddings = (config.embeddings ?? new OpenAIEmbeddings(openai)) as T;

    // Initialize chat completions, defaulting to OpenAIChatCompletions if not provided
    this.chatCompletions = (config.chatCompletions ?? new OpenAIChatCompletions(openai)) as K;

    // If tools are provided, initialize them within the chat completions instance
    if (config.chatCompletionTools?.length) {
      this.chatCompletions.initTools(config.chatCompletionTools);
    }
  }
}
