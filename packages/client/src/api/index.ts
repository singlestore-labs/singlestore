export type APIVersion = 1 | 2;

export class API {
  private readonly _baseUrl: string;

  constructor(
    private readonly _apiKey?: string,
    private readonly _version: APIVersion = 1,
  ) {
    this._baseUrl = `https://api.singlestore.com`;
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

    const response = await fetch(`${this._baseUrl}/v${version}${url}`, {
      method: "GET",
      ...params,
      headers: {
        ...params?.headers,
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this._apiKey}`,
      },
    });

    const contentType = response.headers.get("content-type");

    if (contentType?.startsWith("text/plain")) {
      return response.text() as T;
    }

    return response.json();
  }
}
