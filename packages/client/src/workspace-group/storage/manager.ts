import type { WorkspaceGroupSchema } from "..";
import type { API } from "../../api";
import type { Region, RegionName, RegionSchema } from "../../region";

import { APIManager } from "../../api/manager";

export interface ReplicatedDatabaseSchema {
  region: RegionName;
  databaseName: string;
  duplicationState: "Pending" | "Active" | "Inactive" | "Error";
}

export interface StorageDRStatusSchema {
  compute: {
    storageDRType: "Failover" | "Failback" | "PreProvisionStart" | "PreProvisionStop";
    storageDRState: "Active" | "Completed" | "Failed" | "Expired" | "Canceled";
    completedAttachments: number;
    completedWorkspaces: number;
    totalAttachments: number;
    totalWorkspaces: number;
  };
  storage: ReplicatedDatabaseSchema[];
}

export class WorkspaceGroupStorageManager extends APIManager {
  protected _baseUrl: string;

  constructor(api: API, id: WorkspaceGroupSchema["workspaceGroupID"]) {
    super(api);
    this._baseUrl = `/workspaceGroups/${id}/storage`;
  }

  async getStatus() {
    return this._execute<StorageDRStatusSchema>("/DR/status");
  }

  async getRegions(): Promise<Region[]> {
    const response = await this._execute<RegionSchema[]>("/DR/regions");
    return response.map((data) => ({ id: data.regionID, name: data.region, provider: data.provider }));
  }
}
