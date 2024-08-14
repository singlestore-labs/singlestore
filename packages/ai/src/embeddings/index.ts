export type Embedding = number[];

export interface CreateEmbeddingsOptions<T = any> {
  model: T | (string & {});
}

export interface Embeddings {
  getModels(): string[];
  create<T extends Partial<CreateEmbeddingsOptions>>(input: string | string[], options?: T): Promise<Embedding[]>;
}
