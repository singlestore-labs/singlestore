export interface EmbeddingsCreateOptions<T = any> {
  model: T;
  [K: string]: any;
}

export interface Embeddings {
  create<T extends EmbeddingsCreateOptions>(input: string | string[], options?: Partial<T>): Promise<number[][]>;
}
