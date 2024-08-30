export type Embedding = number[];

export interface CreateEmbeddingsParams {
  model?: string;
}

export abstract class Embeddings {
  abstract getModels(): string[];

  abstract create(input: string | string[], params?: CreateEmbeddingsParams): Promise<Embedding[]>;
}
