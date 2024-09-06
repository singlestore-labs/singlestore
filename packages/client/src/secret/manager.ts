import { APIManager } from "../api/manager";

import { Secret } from ".";

export interface CreateSecretBody {}

interface SecretSchema {
  createdAt: string;
  createdBy: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  name: string;
  secretID: string;
  value: string;
}

export class SecretManager extends APIManager {
  protected _baseUrl: string = "/secrets";

  private _create(data: SecretSchema): Secret {
    return new Secret(
      this._api,
      data.secretID,
      data.name,
      data.value,
      data.createdBy,
      data.lastUpdatedBy,
      new Date(data.createdAt),
      new Date(data.lastUpdatedAt),
    );
  }

  async create<TBody extends CreateSecretBody>(body: TBody) {
    const response = await this._execute("", { method: "POST", body: JSON.stringify(body) });
    return this._create(response);
  }

  async get<T extends { id: string } | { name: string } | undefined = undefined>(
    where?: T,
  ): Promise<(T extends undefined ? Secret[] : Secret) | undefined> {
    let url = "";
    const params = new URLSearchParams();

    if (where) {
      if ("name" in where) {
        params.set("name", where.name);
      } else if ("id" in where) {
        url = `${url}/${where.id}`;
      }
    }

    const response = await this._execute<{ secrets: SecretSchema[] }>(`${url}?${params.toString()}`);

    if (!where) {
      return response.secrets.map((data) => this._create(data)) as T extends undefined ? Secret[] : Secret;
    }

    if (response.secrets[0]) {
      return this._create(response.secrets[0]) as T extends undefined ? Secret[] : Secret;
    }
  }

  async drop(id: string) {
    return Secret.drop(this._api, id);
  }
}
