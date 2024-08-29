/**
 * Represents a single embedding vector as an array of numbers.
 *
 * @typedef {number[]} Embedding
 */
export type Embedding = number[];

/**
 * Parameters for creating embeddings.
 *
 * @interface CreateEmbeddingsParams
 * @property {string} [model] - The model to use for creating embeddings. If not provided, a default model may be used.
 */
export interface CreateEmbeddingsParams {
  model?: string;
}

/**
 * Abstract class representing an embeddings generator.
 *
 * This class defines the contract for creating embeddings and retrieving available models.
 * Implementations must provide concrete methods to get available models and create embeddings
 * using a specified model.
 *
 * @abstract
 * @class Embeddings
 */
export abstract class Embeddings {
  /**
   * Returns a list of available models that can be used for creating embeddings.
   *
   * @abstract
   * @returns {string[]} - An array of model names.
   */
  abstract getModels(): string[];

  /**
   * Creates embeddings from input data using the specified model.
   *
   * This method accepts either a single string or an array of strings as input and generates
   * embeddings for each input. Optionally, a model can be specified using the parameters.
   * If no model is provided, a default model is used.
   *
   * @abstract
   * @param {string | string[]} input - The input text or array of texts to create embeddings for.
   * @param {CreateEmbeddingsParams} [params] - Optional parameters for embedding creation, such as the model to use.
   * @returns {Promise<Embedding[]>} - A promise that resolves to an array of embedding vectors, where each vector is an array of numbers.
   */
  abstract create(input: string | string[], params?: CreateEmbeddingsParams): Promise<Embedding[]>;
}
