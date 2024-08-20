import type { OpenAI } from "openai";
import type { EmbeddingCreateParams } from "openai/resources/embeddings";

import { Embeddings, type CreateEmbeddingsParams, type Embedding } from ".";

type _OpenAICreateEmbeddingsParams = Omit<Partial<EmbeddingCreateParams>, "input" | keyof CreateEmbeddingsParams>;

export type OpenAIEmbeddingModel = EmbeddingCreateParams["model"];

export interface OpenAICreateEmbeddingsParams extends CreateEmbeddingsParams, _OpenAICreateEmbeddingsParams {
  model?: OpenAIEmbeddingModel;
}

export class OpenAIEmbeddings extends Embeddings {
  constructor(private _openai: OpenAI) {
    super();
  }

  getModels(): OpenAIEmbeddingModel[] {
    return ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"];
  }

  async create<T extends OpenAICreateEmbeddingsParams>(input: string | string[], params?: T): Promise<Embedding[]> {
    const _input = Array.isArray(input) ? input : [input];
    const response = await this._openai.embeddings.create({ model: "text-embedding-3-small", ...params, input: _input });
    return response.data.map((data) => data.embedding);
  }
}
