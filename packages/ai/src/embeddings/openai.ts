import type { OpenAI } from "openai";
import type { EmbeddingCreateParams } from "openai/resources/embeddings";

import { Embeddings, type CreateEmbeddingsOptions, type Embedding } from ".";

type _OpenAICreateEmbeddingsOptions = Omit<Partial<EmbeddingCreateParams>, "input" | keyof CreateEmbeddingsOptions>;

export type OpenAIEmbeddingModel = EmbeddingCreateParams["model"];

export interface OpenAICreateEmbeddingsOptions extends CreateEmbeddingsOptions, _OpenAICreateEmbeddingsOptions {
  model?: OpenAIEmbeddingModel;
}

export class OpenAIEmbeddings extends Embeddings {
  constructor(private _openai: OpenAI) {
    super();
  }

  getModels(): OpenAIEmbeddingModel[] {
    return ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"];
  }

  async create<T extends OpenAICreateEmbeddingsOptions>(input: string | string[], options?: T): Promise<Embedding[]> {
    const _input = Array.isArray(input) ? input : [input];
    const response = await this._openai.embeddings.create({ model: "text-embedding-3-small", ...options, input: _input });
    return response.data.map((data) => data.embedding);
  }
}
