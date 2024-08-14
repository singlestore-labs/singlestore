import { OpenAI } from "openai";

import type { ChatCompletions } from "./chat-completions";
import type { Embeddings } from "./embeddings";

import { OpenAIChatCompletions } from "./chat-completions/openai";
import { OpenAIEmbeddings } from "./embeddings/openai";

export type * from "./types";

export type AIConfig<T extends Embeddings, U extends ChatCompletions> = {
  embeddings?: T;
  chatCompletions?: U;
  openAIApiKey?: string;
};

export type AIBase = AI<Embeddings, ChatCompletions>;

export class AI<T extends Embeddings = OpenAIEmbeddings, U extends ChatCompletions = OpenAIChatCompletions> {
  public embeddings;
  public chatCompletions;

  constructor(config: AIConfig<T, U>) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });
    this.embeddings = (config.embeddings || new OpenAIEmbeddings(openai)) as T;
    this.chatCompletions = (config.chatCompletions || new OpenAIChatCompletions(openai)) as U;
  }
}
