import type { API } from "../api";

import { APIManager } from "../api/manager";

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

  static async drop(api: API, id: string): Promise<string> {
    const response = await api.execute<{ secretID: string }>(`/secrets/${id}`, { method: "DELETE" });
    return response.secretID;
  }

  async drop() {
    return Secret.drop(this._api, this.id);
  }
}
