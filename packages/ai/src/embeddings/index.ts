export type Embedding = number[];

export interface CreateEmbeddingsOptions {
  model?: string;
}

export abstract class Embeddings {
  abstract getModels(): string[];
  abstract create(input: string | string[], options?: CreateEmbeddingsOptions): Promise<Embedding[]>;
}
