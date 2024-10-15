import OpenAI from "openai";

import { type AnyChatCompletionTool, type ChatCompletionsManager, OpenAIChatCompletions } from "./chat-completions";
import { type EmbeddingsManager, OpenAIEmbeddingsManager } from "./embeddings";
import { TextSplitter } from "./text-splitter";

export interface AIConfig<
  TChatCompletionTools extends AnyChatCompletionTool[] | undefined,
  TChatCompletionsManager extends ChatCompletionsManager<TChatCompletionTools>,
  TEmbeddingsManager extends EmbeddingsManager,
  TTextSplitter extends TextSplitter,
> {
  openAIApiKey?: string;
  chatCompletionTools?: TChatCompletionTools;
  chatCompletionsManager?: TChatCompletionsManager;
  embeddingsManager?: TEmbeddingsManager;
  textSplitter?: TTextSplitter;
}

export type AnyAI = AI<AnyChatCompletionTool[] | undefined, ChatCompletionsManager<any>, EmbeddingsManager, TextSplitter>;

export class AI<
  TChatCompletionTools extends AnyChatCompletionTool[] | undefined = undefined,
  TChatCompletions extends ChatCompletionsManager<any> = OpenAIChatCompletions<TChatCompletionTools>,
  TEmbeddingsManager extends EmbeddingsManager = OpenAIEmbeddingsManager,
  TTextSplitter extends TextSplitter = TextSplitter,
> {
  embeddings: TEmbeddingsManager;
  chatCompletions: TChatCompletions;
  textSplitter: TTextSplitter;

  constructor(config: AIConfig<TChatCompletionTools, TChatCompletions, TEmbeddingsManager, TTextSplitter>) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    this.chatCompletions = (config.chatCompletionsManager ?? new OpenAIChatCompletions(openai)) as TChatCompletions;
    this.embeddings = (config.embeddingsManager ?? new OpenAIEmbeddingsManager(openai)) as TEmbeddingsManager;
    this.textSplitter = (config.textSplitter ?? new TextSplitter()) as TTextSplitter;

    if (config.chatCompletionTools?.length) {
      this.chatCompletions.initTools(config.chatCompletionTools);
    }
  }
}
