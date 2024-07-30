import type { EmbeddingCreateParams } from "openai/resources/embeddings";
import type { LLM } from "./llm";
import type { Embedder } from "./embedder";
import { OpenAILLM } from "./llm/openai";
import { Embeddings } from "./embeddings";

export * from "./llm";
export * from "./embedder";

export type AIConfig = {
  llm?: LLM;
  embedder?: Embedder;
  openAIApiKey?: string;
};

export class AI<
  T extends AIConfig,
  _LLM = T extends { llm: LLM } ? T["llm"] : OpenAILLM,
  _Embeddings = Embeddings<
    T extends { embedder: Embedder } ? T["embedder"] : Embedder<Partial<Omit<EmbeddingCreateParams, "input">>>
  >,
> {
  public llm: _LLM;
  public embeddings: _Embeddings;

  constructor(config: T) {
    this.llm = (config.llm ? config.llm : new OpenAILLM(config.openAIApiKey)) as _LLM;
    this.embeddings = new Embeddings(config.embedder, config.openAIApiKey) as _Embeddings;
  }
}
