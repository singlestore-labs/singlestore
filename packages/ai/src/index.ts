import { OpenAI } from "openai";

import { ChatCompletionsManager } from "./chat-completions/manager";
import { OpenAIChatCompletions } from "./chat-completions/openai";
import { type AnyChatCompletionTool, ChatCompletionTool } from "./chat-completions/tool";
import { EmbeddingsManager } from "./embeddings/manager";
import { OpenAIEmbeddingsManager } from "./embeddings/openai";

export type * from "./types";
export { ChatCompletionTool, ChatCompletionsManager, EmbeddingsManager };
export * from "./chat-completions/errors";

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
