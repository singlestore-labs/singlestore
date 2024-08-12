export interface EmbeddingsCreateOptions<T = any> {
  model: T | (string & {});
}

export interface Embeddings {
  getModels(): string[];

  create<T extends Partial<EmbeddingsCreateOptions>>(input: string | string[], options?: T): Promise<number[][]>;
}
