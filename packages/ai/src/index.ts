import { type EmbeddingCreateParams } from "openai/src/resources/embeddings.js";
import { type Embedder } from "./embedder";
import { Embeddings } from "./embeddings";

export type SingleStoreAIConfig =
  | {
      openAIApiKey: string;
      embedder?: Embedder;
    }
  | {
      embedder: Embedder;
      openAIApiKey?: string;
    };

export class SingleStoreAI<T extends SingleStoreAIConfig> {
  public embeddings: Embeddings<
    T extends { embedder: Embedder } ? T["embedder"] : Embedder<Partial<Omit<EmbeddingCreateParams, "input">>>
  >;

  constructor(config: T) {
    this.embeddings = new Embeddings<any>(config.embedder, config.openAIApiKey);
  }
}
