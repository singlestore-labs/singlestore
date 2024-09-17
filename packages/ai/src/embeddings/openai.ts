import type { Embedding } from "./embedding";
import type { OpenAI } from "openai";
import type { EmbeddingCreateParams } from "openai/resources/embeddings";

import { type CreateEmbeddingsParams, EmbeddingsManager } from "./manager";

type _OpenAICreateEmbeddingsParams = Omit<Partial<EmbeddingCreateParams>, "input" | keyof CreateEmbeddingsParams>;

export type OpenAIEmbeddingModel = EmbeddingCreateParams["model"];

export interface OpenAICreateEmbeddingsParams extends CreateEmbeddingsParams, _OpenAICreateEmbeddingsParams {
  model?: OpenAIEmbeddingModel;
}

export class OpenAIEmbeddingsManager extends EmbeddingsManager {
  constructor(private _openai: OpenAI) {
    super();
  }

  getModels(): OpenAIEmbeddingModel[] {
    // TODO: Replace with dynamic values
    return ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"];
  }

  async create(input: string | string[], params?: OpenAICreateEmbeddingsParams): Promise<Embedding[]> {
    const _input = Array.isArray(input) ? input : [input];
    const response = await this._openai.embeddings.create({ model: "text-embedding-3-small", ...params, input: _input });
    return response.data.map((data) => data.embedding);
  }
}
