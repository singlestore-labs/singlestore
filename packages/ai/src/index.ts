import { OpenAI } from "openai";

import { ChatCompletions } from "./chat-completions";
import { OpenAIChatCompletions } from "./chat-completions/openai";
import { ChatCompletionTool } from "./chat-completions/tool";
import { Embeddings } from "./embeddings";
import { OpenAIEmbeddings } from "./embeddings/openai";

export type * from "./types";
export { Embeddings, ChatCompletions, ChatCompletionTool };

export interface AIConfig {
  openAIApiKey?: string;
  embeddings?: Embeddings;
  chatCompletions?: ChatCompletions;
  chatCompletionTools?: ChatCompletionTool[];
}

export class AI<T extends AIConfig = AIConfig> {
  embeddings: T["embeddings"] extends Embeddings ? T["embeddings"] : OpenAIEmbeddings;
  chatCompletions: T["chatCompletions"] extends ChatCompletions ? T["chatCompletions"] : OpenAIChatCompletions;

  constructor(config: T) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    this.embeddings = (config.embeddings ?? new OpenAIEmbeddings(openai)) as this["embeddings"];
    this.chatCompletions = (config.chatCompletions ?? new OpenAIChatCompletions(openai)) as this["chatCompletions"];

    if (config.chatCompletionTools?.length) {
      this.chatCompletions.addTools(config.chatCompletionTools);
    }
  }
}
