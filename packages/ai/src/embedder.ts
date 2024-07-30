export interface Embedder<T = { [K: string]: any }> {
  (input: string | string[], options?: T): Promise<number[][]>;
}
