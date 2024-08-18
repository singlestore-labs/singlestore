import { OpenAI } from "openai";

import { ChatCompletions } from "./chat-completions";
import { OpenAIChatCompletions } from "./chat-completions/openai";
import { AnyChatCompletionTool, ChatCompletionTool } from "./chat-completions/tool";
import { Embeddings } from "./embeddings";
import { OpenAIEmbeddings } from "./embeddings/openai";

export type * from "./types";
export { Embeddings, ChatCompletions, ChatCompletionTool };

export interface AIConfig<T extends Embeddings, U extends AnyChatCompletionTool[] | undefined, K extends ChatCompletions<U>> {
  openAIApiKey?: string;
  embeddings?: T;
  chatCompletions?: K;
  chatCompletionTools?: U;
}

export type AnyAI = AI<Embeddings, AnyChatCompletionTool[] | undefined, ChatCompletions<any>>;

export class AI<
  T extends Embeddings = OpenAIEmbeddings,
  U extends AnyChatCompletionTool[] | undefined = undefined,
  K extends ChatCompletions<any> = OpenAIChatCompletions<U>,
> {
  embeddings: T;
  chatCompletions: K;

  constructor(config: AIConfig<T, U, K>) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    this.embeddings = (config.embeddings ?? new OpenAIEmbeddings(openai)) as T;
    this.chatCompletions = (config.chatCompletions ?? new OpenAIChatCompletions(openai)) as K;

    if (config.chatCompletionTools?.length) {
      this.chatCompletions.initTools(config.chatCompletionTools);
    }
  }
}
