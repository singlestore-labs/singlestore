import type { Defined } from "@repo/utils";

import { APIManager } from "../api/manager";

import { Secret, type SecretSchema } from ".";

export interface CreateSecretBody {
  name: SecretSchema["name"];
  value: Defined<SecretSchema["value"]>;
}

export class SecretManager extends APIManager {
  protected _baseUrl: string = "/secrets";

  private _create(data: SecretSchema): Secret {
    return new Secret(
      this._api,
      data.secretID,
      data.name,
      data.value,
      data.lastUpdatedBy,
      new Date(data.lastUpdatedAt),
      data.createdBy,
      new Date(data.createdAt),
    );
  }

  async create(body: CreateSecretBody) {
    const response = await this._execute<{ secret: SecretSchema }>("", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return this._create(response.secret);
  }

  async get<
    T extends { id: SecretSchema["secretID"] } | { name: SecretSchema["name"] } | undefined = undefined,
    _TReturnType = T extends undefined ? Secret[] : Secret | undefined,
  >(where?: T): Promise<_TReturnType> {
    let url = "";
    const params = new URLSearchParams();

    if (where) {
      if ("name" in where) {
        params.set("name", where.name);
      } else if ("id" in where) {
        url = `${url}/${where.id}`;
      }
    }

    type Response = T extends undefined
      ? SecretSchema[]
      : T extends { id: string }
        ? { secret: SecretSchema }
        : { secrets: SecretSchema[] };
    const response = await this._execute<Response>(`${url}?${params.toString()}`);

    if ("secrets" in response) {
      if (!where) {
        return response.secrets.map((data) => this._create(data)) as _TReturnType;
      }

      if (response.secrets[0]) {
        return this._create(response.secrets[0]) as _TReturnType;
      }
    }

    if ("secret" in response && response.secret) {
      return this._create(response.secret) as _TReturnType;
    }

    return [] as unknown as _TReturnType;
  }

  async update(id: SecretSchema["secretID"], value: Defined<SecretSchema["value"]>) {
    return Secret.update(this._api, id, value);
  }

  async delete(id: SecretSchema["secretID"]) {
    return Secret.delete(this._api, id);
  }
}
