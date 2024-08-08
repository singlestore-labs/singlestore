import { OpenAI } from "openai";
import type { LLM } from "./llm";
import { OpenAILLM } from "./llm/openai";
import type { Embeddings } from "./embeddings";
import { OpenAIEmbeddings } from "./embeddings/openai";

export type * from "./types";

export type AIConfig = {
  llm: LLM;
  embeddings: Embeddings;
  openAIApiKey: string;
};

export class AI<T extends AIConfig = AIConfig> {
  public llm;
  public embeddings;

  constructor(config: Partial<T>) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    type _LLM = T extends { llm: LLM } ? T["llm"] : OpenAILLM;
    this.llm = (config.llm || new OpenAILLM(openai)) as _LLM;

    type _Embeddings = T extends { embeddings: Embeddings } ? T["embeddings"] : OpenAIEmbeddings;
    this.embeddings = (config.embeddings || new OpenAIEmbeddings(openai)) as _Embeddings;
  }
}
