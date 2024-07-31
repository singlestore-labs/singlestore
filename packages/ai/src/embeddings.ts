import type { OpenAI } from "openai";
import type { EmbeddingCreateParams } from "openai/resources/embeddings";

export type Embedder<T = any> = (input: string | string[], options?: T) => Promise<number[][]>;

export type DefaultEmbedder = Embedder<Partial<Omit<EmbeddingCreateParams, "input">>>;

export class Embeddings<T extends Embedder> {
  constructor(
    private _openai: OpenAI,
    private _embedder?: T,
  ) {}

  async create(...[input, options]: Parameters<T>): Promise<number[][]> {
    if (this._embedder) {
      return this._embedder(input, options);
    }

    const _input = Array.isArray(input) ? input : [input];
    const response = await this._openai.embeddings.create({ model: "text-embedding-3-small", ...options, input: _input });
    return response.data.map((data) => data.embedding);
  }
}
