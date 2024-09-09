import type { API } from "../api";

import { APIManager } from "../api/manager";

export interface SecretSchema {
  createdAt: string;
  createdBy: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  name: string;
  secretID: string;
  value: string;
}

export class Secret extends APIManager {
  protected _baseUrl: string;

  constructor(
    api: API,
    public id: string,
    public name: string,
    public value: string | undefined,
    public createdBy: string,
    public lastUpdatedBy: string,
    public createdAt: Date,
    public lastUpdatedAt: Date,
  ) {
    super(api);
    this._baseUrl = `/secrets/${this.id}`;
  }

  static async update(api: API, id: string, value: string): Promise<Secret> {
    const response = await api.execute<SecretSchema>(`/secrets/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
    });

    return new Secret(
      api,
      response.secretID,
      response.name,
      response.value,
      response.createdBy,
      response.lastUpdatedBy,
      new Date(response.createdAt),
      new Date(response.lastUpdatedAt),
    );
  }

  static async drop(api: API, id: string): Promise<string> {
    const response = await api.execute<{ secretID: string }>(`/secrets/${id}`, { method: "DELETE" });
    return response.secretID;
  }

  async update(value: string) {
    return Secret.update(this._api, this.id, value);
  }

  async drop() {
    return Secret.drop(this._api, this.id);
  }
}
