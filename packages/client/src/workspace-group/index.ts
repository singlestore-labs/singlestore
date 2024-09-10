import { getKeyByValue } from "@repo/utils";

import type { API } from "../api";
import type { PrivateConnection, PrivateConnectionSchema } from "../private-connection";

import { APIManager } from "../api/manager";

import { WorkspaceGroupStorageManager } from "./storage/manager";

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

export interface UpdateWorkspaceGroupBody
  extends Partial<Pick<WorkspaceGroupSchema, "name" | "allowAllTraffic" | "firewallRanges">> {
  expiresAt?: Date;
  adminPassword?: string;
  updateWindow?: WorkspaceGroupUpdateWindow;
}

export const updateWindowDaysMap: Record<number, WorkspaceGroupUpdateWindow["day"]> = {
  0: "su",
  1: "mo",
  2: "tu",
  3: "we",
  4: "th",
  5: "fr",
  6: "sa",
};

export class WorkspaceGroup extends APIManager {
  protected _baseUrl: string;
  storage: WorkspaceGroupStorageManager;

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
    this.storage = new WorkspaceGroupStorageManager(this._api, this.id);
  }

  static serializeUpdateWindow(updateWindow: WorkspaceGroupUpdateWindow): WorkspaceGroupUpdateWindowSchema {
    const day = getKeyByValue(updateWindowDaysMap, updateWindow.day);
    if (!day) {
      throw new Error(
        `Day not found with the given name. Please provide a valid day from the following list: ${Object.values(updateWindowDaysMap).join(", ")}.`,
      );
    }

    return { ...updateWindow, day: Number(day) };
  }

  static async update(
    api: API,
    id: WorkspaceGroupSchema["workspaceGroupID"],
    body: UpdateWorkspaceGroupBody,
  ): Promise<WorkspaceGroupSchema["workspaceGroupID"]> {
    const expiresAt = body.expiresAt ? body.expiresAt.toISOString().split(".")[0] + "Z" : undefined;
    const updateWindow = body.updateWindow ? WorkspaceGroup.serializeUpdateWindow(body.updateWindow) : undefined;
    const response = await api.execute<Pick<WorkspaceGroupSchema, "workspaceGroupID">>(`/workspaceGroups/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...body, expiresAt, updateWindow }),
    });

    return response.workspaceGroupID;
  }

  static async delete(
    api: API,
    id: WorkspaceGroupSchema["workspaceGroupID"],
    force?: boolean,
  ): Promise<WorkspaceGroupSchema["workspaceGroupID"]> {
    const params = new URLSearchParams({ force: force ? String(force) : String(false) });
    const response = await api.execute<Pick<WorkspaceGroupSchema, "workspaceGroupID">>(
      `/workspaceGroups/${id}?${params.toString()}`,
      { method: "DELETE" },
    );

    return response.workspaceGroupID;
  }

  async update(body: UpdateWorkspaceGroupBody) {
    return WorkspaceGroup.update(this._api, this.id, body);
  }

  async delete(force?: boolean) {
    return WorkspaceGroup.delete(this._api, this.id, force);
  }

  async getPrivateConnections(): Promise<PrivateConnection[]> {
    const response = await this._execute<PrivateConnectionSchema[]>(`/privateConnections`);
    return response.map((data) => ({
      ...data,
      createdAt: new Date(data.createdAt),
      deletedAt: new Date(data.deletedAt),
      updatedAt: new Date(data.updatedAt),
      activeAt: new Date(data.activeAt),
    }));
  }
}
