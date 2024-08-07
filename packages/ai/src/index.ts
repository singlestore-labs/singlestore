import { OpenAI } from "openai";
import { type DefaultEmbedder, type Embedder, Embeddings } from "./embeddings";
import type { LLM } from "./llm";
import { OpenAILLM } from "./llm/openai";

export type * from "./types";

export type AIConfig = {
  llm: LLM;
  embedder: Embedder;
  openAIApiKey: string;
};

export class AI<T extends Partial<AIConfig> = Partial<AIConfig>> {
  public llm;
  public embeddings;

  constructor(config: T) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    type _LLM = T extends { llm: LLM } ? T["llm"] : OpenAILLM;
    this.llm = (config.llm || new OpenAILLM(openai)) as _LLM;

    type _Embedder = T extends { embedder: Embedder } ? T["embedder"] : DefaultEmbedder;
    this.embeddings = new Embeddings<_Embedder>(openai, config.embedder as _Embedder);
  }
}
