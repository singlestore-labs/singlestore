import type { OpenAI } from "openai";
import type { Embeddings } from ".";

export class OpenAIEmbeddings implements Embeddings {
  constructor(private _openai: OpenAI) {}

  async create<T extends Omit<Parameters<typeof this._openai.embeddings.create>[0], "input">>(
    input: string | string[],
    options?: Partial<T>,
  ): Promise<number[][]> {
    const _input = Array.isArray(input) ? input : [input];
    const response = await this._openai.embeddings.create({ model: "text-embedding-3-small", ...options, input: _input });
    return response.data.map((data) => data.embedding);
  }
}
