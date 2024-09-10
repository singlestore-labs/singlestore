import type { Region, RegionSchema } from ".";

import { APIManager } from "../api/manager";

export class RegionManager extends APIManager {
  protected _baseUrl: string = "/regions";

  async get(): Promise<Region[]> {
    const response = await this._execute<RegionSchema[]>();

    return response.map((data) => ({
      id: data.regionID,
      name: data.region,
      provider: data.provider,
    }));
  }
}
