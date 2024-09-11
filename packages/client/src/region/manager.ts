import type { Region, RegionSchema } from ".";

import { APIManager } from "../api/manager";

export class RegionManager extends APIManager {
  protected _baseURL: string = "/regions";

  async get<
    T extends { id: RegionSchema["regionID"] } | { name: RegionSchema["region"] } | undefined = undefined,
    _ReturnType = T extends { id: RegionSchema["regionID"] } | { name: RegionSchema["region"] } ? Region | undefined : Region[],
  >(where?: T): Promise<_ReturnType> {
    const response = await this._execute<RegionSchema[]>();

    if (where && ("id" in where || "name" in where)) {
      const region = response.find((region) => {
        if ("id" in where) return region.regionID === where.id;
        if ("name" in where) return region.region === where.name;
        return false;
      });

      if (!region) return undefined as _ReturnType;

      return {
        id: region.regionID,
        name: region.region,
        provider: region.provider,
      } as _ReturnType;
    }

    return response.map((data) => ({
      id: data.regionID,
      name: data.region,
      provider: data.provider,
    })) as _ReturnType;
  }
}
