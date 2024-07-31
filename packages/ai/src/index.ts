import { OpenAI } from "openai";
import { type DefaultEmbedder, type Embedder, Embeddings } from "./embeddings";

export type * from "./types";

export type AIConfig = {
  embedder?: Embedder;
  openAIApiKey?: string;
};

export class AI<T extends AIConfig = AIConfig> {
  public embeddings;

  constructor(config: T) {
    const openai = new OpenAI({ apiKey: config.openAIApiKey });

    type _Embedder = T extends { embedder: Embedder } ? T["embedder"] : DefaultEmbedder;
    this.embeddings = new Embeddings<_Embedder>(openai, config.embedder as _Embedder);
  }
}
