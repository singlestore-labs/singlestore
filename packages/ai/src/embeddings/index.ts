export interface EmbeddingsCreateOptions<T = any> {
  model: T | (string & {});
}

export interface Embeddings {
  getModels(): string[];

  create<T extends EmbeddingsCreateOptions & { [K: string]: any }>(
    input: string | string[],
    options?: Partial<T>,
  ): Promise<number[][]>;
}
