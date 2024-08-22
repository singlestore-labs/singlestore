/**
 * Represents a single embedding vector as an array of numbers.
 */
export type Embedding = number[];

/**
 * Parameters for creating embeddings.
 *
 * @property {string} [model] - The model to use for creating embeddings. If not provided, a default model may be used.
 */
export interface CreateEmbeddingsParams {
  model?: string;
}

/**
 * Abstract class representing an embeddings generator.
 * Implementations must provide methods to get available models and create embeddings.
 */
export abstract class Embeddings {
  /**
   * Returns a list of available models that can be used for creating embeddings.
   *
   * @returns {string[]} - Array of model names.
   */
  abstract getModels(): string[];

  /**
   * Creates embeddings from input data using the specified model.
   *
   * @param {string | string[]} input - The input text or array of texts to create embeddings for.
   * @param {CreateEmbeddingsParams} [params] - Optional parameters for embedding creation.
   * @returns {Promise<Embedding[]>} - A promise that resolves to an array of embedding vectors.
   */
  abstract create(input: string | string[], params?: CreateEmbeddingsParams): Promise<Embedding[]>;
}
