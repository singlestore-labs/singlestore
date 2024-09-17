import OpenAI from "openai";

import { type AnyChatCompletionTool, type ChatCompletionsManager, OpenAIChatCompletions } from "./chat-completions";
import { type EmbeddingsManager, OpenAIEmbeddingsManager } from "./embeddings";

export interface AIConfig<
  TChatCompletionTools extends AnyChatCompletionTool[] | undefined,
  TChatCompletionsManager extends ChatCompletionsManager<TChatCompletionTools>,
  TEmbeddingsManager extends EmbeddingsManager,
> {
  openAIApiKey?: string;
  chatCompletionTools?: TChatCompletionTools;
  chatCompletionsManager?: TChatCompletionsManager;
  embeddingsManager?: TEmbeddingsManager;
}

export type AnyAI = AI<AnyChatCompletionTool[] | undefined, ChatCompletionsManager<any>, EmbeddingsManager>;

export class AI<
  TChatCompletionTools extends AnyChatCompletionTool[] | undefined = undefined,
  TChatCompletions extends ChatCompletionsManager<any> = OpenAIChatCompletions<TChatCompletionTools>,
  TEmbeddingsManager extends EmbeddingsManager = OpenAIEmbeddingsManager,
> {
  embeddings: TEmbeddingsManager;
  chatCompletions: TChatCompletions;

  constructor(config: AIConfig<TChatCompletionTools, TChatCompletions, TEmbeddingsManager>) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    this.chatCompletions = (config.chatCompletionsManager ?? new OpenAIChatCompletions(openai)) as TChatCompletions;
    this.embeddings = (config.embeddingsManager ?? new OpenAIEmbeddingsManager(openai)) as TEmbeddingsManager;

    if (config.chatCompletionTools?.length) {
      this.chatCompletions.initTools(config.chatCompletionTools);
    }
  }
}
