import { OpenAI } from "openai";

import { ChatCompletions } from "./chat-completions";
import { OpenAIChatCompletions } from "./chat-completions/openai";
import { Embeddings } from "./embeddings";
import { OpenAIEmbeddings } from "./embeddings/openai";

export type * from "./types";
export { Embeddings, ChatCompletions };

export interface AIConfig {
  embeddings?: Embeddings;
  chatCompletions?: ChatCompletions;
  openAIApiKey?: string;
}

export class AI<T extends AIConfig = AIConfig> {
  embeddings: T["embeddings"] extends Embeddings ? T["embeddings"] : OpenAIEmbeddings;
  chatCompletions: T["chatCompletions"] extends ChatCompletions ? T["chatCompletions"] : OpenAIChatCompletions;

  constructor(config: T) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });
    this.embeddings = (config.embeddings ?? new OpenAIEmbeddings(openai)) as this["embeddings"];
    this.chatCompletions = (config.chatCompletions ?? new OpenAIChatCompletions(openai)) as this["chatCompletions"];
  }
}
