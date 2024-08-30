import { OpenAI } from "openai";

import { ChatCompletions } from "./chat-completions";
import { OpenAIChatCompletions } from "./chat-completions/openai";
import { AnyChatCompletionTool, ChatCompletionTool } from "./chat-completions/tool";
import { Embeddings } from "./embeddings";
import { OpenAIEmbeddings } from "./embeddings/openai";

export type * from "./types";
export { Embeddings, ChatCompletions, ChatCompletionTool };
export * from "./chat-completions/errors";

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

export type AnyAI = AI<Embeddings, AnyChatCompletionTool[] | undefined, ChatCompletions<any>>;

export class AI<
  TEmbeddings extends Embeddings = OpenAIEmbeddings,
  TChatCompletionTool extends AnyChatCompletionTool[] | undefined = undefined,
  TChatCompletions extends ChatCompletions<any> = OpenAIChatCompletions<TChatCompletionTool>,
> {
  embeddings: TEmbeddings;
  chatCompletions: TChatCompletions;

  constructor(config: AIConfig<TEmbeddings, TChatCompletionTool, TChatCompletions>) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    this.embeddings = (config.embeddings ?? new OpenAIEmbeddings(openai)) as TEmbeddings;
    this.chatCompletions = (config.chatCompletions ?? new OpenAIChatCompletions(openai)) as TChatCompletions;

    if (config.chatCompletionTools?.length) {
      this.chatCompletions.initTools(config.chatCompletionTools);
    }
  }
}
