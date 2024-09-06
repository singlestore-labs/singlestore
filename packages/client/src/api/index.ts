export class API {
  private readonly _baseUrl: string;

  constructor(
    private readonly _apiKey?: string,
    private readonly _version: number = 1,
  ) {
    this._baseUrl = `https://api.singlestore.com/v${this._version}`;
  }

  async execute<T = any>(url: string, params?: RequestInit): Promise<T> {
    if (!this._apiKey) {
      throw new Error(
        "The Management API key is undefined. Please generate a valid API key. For more info read: https://docs.singlestore.com/cloud/reference/management-api/#generate-an-api-key",
      );
    }

    const response = await fetch(`${this._baseUrl}${url}`, {
      method: "GET",
      ...params,
      headers: {
        ...params?.headers,
        Accept: "application/json",
        Authorization: `Bearer ${this._apiKey}`,
      },
    });

    return response.json();
  }
}
