import type { Embedder } from "./embedder";

export class Embeddings<T extends Embedder> {
  constructor(
    private _embedder?: T,
    private _openAIApiKey?: string,
  ) {}

  async create(input: string | string[], options?: Parameters<T>[1]): Promise<number[][]> {
    if (this._embedder) {
      return this._embedder(input, options);
    }

    const _input = Array.isArray(input) ? input : [input];
    const openai = new (await import("openai")).default({ apiKey: this._openAIApiKey });
    const response = await openai.embeddings.create({ model: "text-embedding-3-small", ...options, input: _input });
    return response.data.map(({ embedding }) => embedding);
  }
}
