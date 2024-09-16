import type { Embedding } from ".";

export interface CreateEmbeddingsParams {
  model?: string;
}

export abstract class EmbeddingsManager {
  abstract getModels(): string[];

  abstract create(input: string | string[], params?: CreateEmbeddingsParams): Promise<Embedding[]>;
}