import type { API } from ".";

export abstract class APIManager {
  protected abstract readonly _baseUrl: string;

  constructor(protected readonly _api: API) {}

  protected execute<T = any>(...[url, params]: Partial<Parameters<API["execute"]>>) {
    return this._api.execute<T>(`${this._baseUrl}${url ?? ""}`, params);
  }
}
