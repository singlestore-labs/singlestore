import type { API } from ".";

export abstract class APIManager {
  protected abstract readonly _baseURL: string;

  constructor(protected readonly _api: API) {}

  protected _execute<T = any>(...[url, params]: Partial<Parameters<API["execute"]>>) {
    return this._api.execute<T>(`${this._baseURL}${url ?? ""}`, params);
  }
}
