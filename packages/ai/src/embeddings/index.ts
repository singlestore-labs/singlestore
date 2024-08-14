export type Embedding = number[];
export type EmbeddingModel = string;

export type CreateEmbeddingsInput = string | string[];
export interface CreateEmbeddingsOptions<T = any> {
  model: T | (string & {});
}

export interface Embeddings {
  getModels(): EmbeddingModel[];
  create<T extends Partial<CreateEmbeddingsOptions>>(input: CreateEmbeddingsInput, options?: T): Promise<Embedding[]>;
}
