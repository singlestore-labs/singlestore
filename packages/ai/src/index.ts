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
 * @typeParam TEmbeddings - The type of `Embeddings` to be used, defaulting to `OpenAIEmbeddings`.
 * @typeParam TChatCompletionTool - An array of tools that can be used during chat completions, or undefined.
 * @typeParam TChatCompletion - The type of `ChatCompletions` to be used, defaulting to `OpenAIChatCompletions`.
 *
 * @property {string} [openAIApiKey] - The API key for authenticating with the OpenAI API.
 * @property {TEmbeddings} [embeddings] - An instance of `Embeddings` used for generating embeddings. Defaults to `OpenAIEmbeddings`.
 * @property {TChatCompletion} [chatCompletions] - An instance of `ChatCompletions` used for generating chat completions. Defaults to `OpenAIChatCompletions`.
 * @property {TChatCompletionTool} [chatCompletionTools] - An optional array of tools that can be used during chat completions.
 */
export interface AIConfig<
  TEmbeddings extends Embeddings,
  TChatCompletionTool extends AnyChatCompletionTool[] | undefined,
  TChatCompletion extends ChatCompletions<TChatCompletionTool>,
> {
  openAIApiKey?: string;
  embeddings?: TEmbeddings;
  chatCompletions?: TChatCompletion;
  chatCompletionTools?: TChatCompletionTool;
}

/**
 * Represents any `AI` instance with generic types for embeddings, tools, and chat completions.
 * This type is useful for handling `AI` instances in a generic context.
 */
export type AnyAI = AI<Embeddings, AnyChatCompletionTool[] | undefined, ChatCompletions<any>>;

/**
 * Main class for handling AI operations, including embeddings and chat completions.
 *
 * @typeParam TEmbeddings - The type of `Embeddings` to be used, defaulting to `OpenAIEmbeddings`.
 * @typeParam TChatCompletionTool - An array of tools that can be used during chat completions, or undefined.
 * @typeParam TChatCompletions - The type of `ChatCompletions` to be used, defaulting to `OpenAIChatCompletions`.
 *
 * @property {TEmbeddings} embeddings - An instance of `Embeddings` used for generating embeddings.
 * @property {TChatCompletions} chatCompletions - An instance of `ChatCompletions` used for generating chat completions.
 */
export class AI<
  TEmbeddings extends Embeddings = OpenAIEmbeddings,
  TChatCompletionTool extends AnyChatCompletionTool[] | undefined = undefined,
  TChatCompletions extends ChatCompletions<any> = OpenAIChatCompletions<TChatCompletionTool>,
> {
  embeddings: TEmbeddings;
  chatCompletions: TChatCompletions;

  /**
   * Constructs a new `AI` instance.
   *
   * @param {AIConfig<TEmbeddings, TChatCompletionTool, TChatCompletions>} config - The configuration object for initializing the `AI` instance.
   */
  constructor(config: AIConfig<TEmbeddings, TChatCompletionTool, TChatCompletions>) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    this.embeddings = (config.embeddings ?? new OpenAIEmbeddings(openai)) as TEmbeddings;
    this.chatCompletions = (config.chatCompletions ?? new OpenAIChatCompletions(openai)) as TChatCompletions;

    if (config.chatCompletionTools?.length) {
      this.chatCompletions.initTools(config.chatCompletionTools);
    }
  }
}
