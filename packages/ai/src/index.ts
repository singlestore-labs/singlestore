import { OpenAI } from "openai";

import type { ChatCompletions } from "./chat-completions";
import type { Embeddings } from "./embeddings";

import { OpenAIChatCompletions } from "./chat-completions/openai";
import { OpenAIEmbeddings } from "./embeddings/openai";

export type * from "./types";

export type AIConfig = {
  embeddings: Embeddings;
  chatCompletions: ChatCompletions;
  openAIApiKey: string;
};

export class AI<T extends Partial<AIConfig> = Partial<AIConfig>> {
  public embeddings;
  public chatCompletions;

  constructor(config: T) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    type _Embeddings = T extends { embeddings: Embeddings } ? T["embeddings"] : OpenAIEmbeddings;
    this.embeddings = (config.embeddings || new OpenAIEmbeddings(openai)) as _Embeddings;

    type _ChatCompletions = T extends { chatCompletions: ChatCompletions } ? T["chatCompletions"] : OpenAIChatCompletions;
    this.chatCompletions = (config.chatCompletions || new OpenAIChatCompletions(openai)) as _ChatCompletions;
  }
}
