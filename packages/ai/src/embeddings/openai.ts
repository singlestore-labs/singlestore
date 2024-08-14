import type { Embedding, Embeddings, CreateEmbeddingsInput, CreateEmbeddingsOptions } from ".";
import type { OpenAI } from "openai";

export type OpenAIEmbeddingModel = "text-embedding-3-small" | "text-embedding-3-large" | "text-embedding-ada-002";

export type OpenAIChatEmbeddingsCreateOptions = CreateEmbeddingsOptions<OpenAIEmbeddingModel> &
  Omit<Parameters<OpenAI["embeddings"]["create"]>[0], "input" | keyof CreateEmbeddingsOptions>;

export class OpenAIEmbeddings implements Embeddings {
  constructor(private _openai: OpenAI) {}

  getModels(): OpenAIEmbeddingModel[] {
    return ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"];
  }

  async create<T extends Partial<OpenAIChatEmbeddingsCreateOptions>>(
    input: CreateEmbeddingsInput,
    options?: T,
  ): Promise<Embedding[]> {
    const _input = Array.isArray(input) ? input : [input];
    const response = await this._openai.embeddings.create({ model: "text-embedding-3-small", ...options, input: _input });
    return response.data.map((data) => data.embedding);
  }
}
