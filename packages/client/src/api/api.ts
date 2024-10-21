export type APIVersion = 1 | 2;

export class API {
  private readonly _baseURL: string;

  constructor(
    private readonly _apiKey?: string,
    private readonly _version: APIVersion = 1,
  ) {
    this._baseURL = `https://api.singlestore.com`;
  }

  async execute<T = any>(
    url: string,
    { version = this._version, ...params }: RequestInit & { version?: APIVersion } = {},
  ): Promise<T> {
    if (!this._apiKey) {
      throw new Error(
        "The Management API key is undefined. Please generate a valid API key. For more info read: https://docs.singlestore.com/cloud/reference/management-api/#generate-an-api-key",
      );
    }

    const _url = `${this._baseURL}/v${version}${url}`;

    const response = await fetch(_url, {
      method: "GET",
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...params?.headers,
        "Authorization": `Bearer ${this._apiKey}`,
      },
    });

    const contentType = response.headers.get("content-type");

    if (contentType?.startsWith("text/plain")) {
      return response.text() as T;
    }

    return response.json() as T;
  }
}
