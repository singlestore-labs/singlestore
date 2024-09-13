import type { API } from "../api";
import type { Defined } from "@repo/utils";

import { APIManager } from "../api/manager";

export interface SecretSchema {
  secretID: string;
  name: string;
  value: string | undefined;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  createdBy: string;
  createdAt: string;
}

export class Secret extends APIManager {
  protected _baseURL: string;

  constructor(
    api: API,
    public id: SecretSchema["secretID"],
    public name: SecretSchema["name"],
    public value: SecretSchema["value"],
    public lastUpdatedBy: SecretSchema["lastUpdatedBy"],
    public lastUpdatedAt: Date,
    public createdBy: SecretSchema["createdBy"],
    public createdAt: Date,
  ) {
    super(api);
    this._baseURL = Secret.getBaseURL(this.id);
  }

  static getBaseURL(id: SecretSchema["secretID"]) {
    return `/secrets/${id}`;
  }

  static async update(api: API, id: SecretSchema["secretID"], value: Defined<SecretSchema["value"]>): Promise<Secret> {
    const response = await api.execute<SecretSchema>(this.getBaseURL(id), {
      method: "PATCH",
      body: JSON.stringify({ value }),
    });

    return new Secret(
      api,
      response.secretID,
      response.name,
      response.value,
      response.lastUpdatedBy,
      new Date(response.lastUpdatedAt),
      response.createdBy,
      new Date(response.createdAt),
    );
  }

  static async delete(api: API, id: SecretSchema["secretID"]): Promise<SecretSchema["secretID"]> {
    const response = await api.execute<Pick<SecretSchema, "secretID">>(this.getBaseURL(id), { method: "DELETE" });
    return response.secretID;
  }

  async update(value: Defined<SecretSchema["value"]>) {
    return Secret.update(this._api, this.id, value);
  }

  async delete() {
    return Secret.delete(this._api, this.id);
  }
}
