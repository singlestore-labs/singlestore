import { APIManager } from "../api/manager";

import { Region, type RegionName, type RegionProvider } from ".";

export class RegionManager extends APIManager {
  protected _baseUrl: string = "/regions";

  async get() {
    const response = await this.execute<{ regionID: string; region: RegionName; provider: RegionProvider }[]>();
    return response.map((data) => new Region(data.regionID, data.region, data.provider));
  }
}
