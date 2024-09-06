import type { Region, RegionName, RegionProvider } from ".";

import { APIManager } from "../api/manager";

export class RegionManager extends APIManager {
  protected _baseUrl: string = "/regions";

  async get(): Promise<Region[]> {
    const response = await this.execute<{ regionID: string; region: RegionName; provider: RegionProvider }[]>();
    return response.map((data) => ({
      id: data.regionID,
      name: data.region,
      provider: data.provider,
    }));
  }
}
