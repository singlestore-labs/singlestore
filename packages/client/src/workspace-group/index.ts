import type { API } from "../api";

import { APIManager } from "../api/manager";

export interface WorkspaceGroupUpdateWindowSchema {
  day: number;
  hour: number;
}

export interface WorkspaceGroupUpdateWindow extends Omit<WorkspaceGroupUpdateWindowSchema, "day"> {
  day: "mo" | "tu" | "we" | "th" | "fr" | "sa" | "su";
}

export interface WorkspaceGroupSchema {
  workspaceGroupID: string;
  name: string;
  regionID: string;
  state: "ACTIVE" | "PENDING" | "FAILED" | "TERMINATED";
  smartDRStatus: "ACTIVE" | "STANDBY" | undefined;
  allowAllTraffic: boolean | undefined;
  firewallRanges: string[];
  updateWindow: WorkspaceGroupUpdateWindowSchema;
  createdAt: string;
  expiresAt: string | undefined;
  terminatedAt: string | undefined;
}

export class WorkspaceGroup extends APIManager {
  protected _baseUrl: string;

  constructor(
    api: API,
    public id: WorkspaceGroupSchema["workspaceGroupID"],
    public name: WorkspaceGroupSchema["name"],
    public regionID: WorkspaceGroupSchema["regionID"],
    public state: WorkspaceGroupSchema["state"],
    public smartDRStatus: WorkspaceGroupSchema["smartDRStatus"],
    public allowAllTraffic: WorkspaceGroupSchema["allowAllTraffic"],
    public firewallRanges: WorkspaceGroupSchema["firewallRanges"],
    public updateWindow: WorkspaceGroupUpdateWindow,
    public createdAt: Date,
    public expiresAt: Date | undefined,
    public terminatedAt: Date | undefined,
  ) {
    super(api);
    this._baseUrl = `/workspaceGroups/${this.id}`;
  }

  static async delete(
    api: API,
    id: WorkspaceGroupSchema["workspaceGroupID"],
    force?: boolean,
  ): Promise<WorkspaceGroupSchema["workspaceGroupID"]> {
    const params = new URLSearchParams({ force: force ? String(force) : String(false) });
    const response = await api.execute<Pick<WorkspaceGroupSchema, "workspaceGroupID">>(
      `/workspaceGroups/${id}?${params.toString()}`,
      {
        method: "DELETE",
      },
    );
    return response.workspaceGroupID;
  }

  async delete(force?: boolean) {
    return WorkspaceGroup.delete(this._api, this.id, force);
  }
}
