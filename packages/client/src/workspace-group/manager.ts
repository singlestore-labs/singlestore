import { APIManager } from "../api/manager";

import { WorkspaceGroup, WorkspaceGroupUpdateWindow, type WorkspaceGroupSchema } from ".";

export interface CreateWorkspaceGroupBody {}

const updateWindowDaysMap: Record<number, WorkspaceGroupUpdateWindow["day"]> = {
  0: "su",
  1: "mo",
  2: "tu",
  3: "we",
  4: "th",
  5: "fr",
  6: "sa",
};

export class WorkspaceGroupManager extends APIManager {
  protected _baseUrl: string = "/workspaceGroups";

  private _create(data: WorkspaceGroupSchema): WorkspaceGroup {
    return new WorkspaceGroup(
      this._api,
      data.workspaceGroupID,
      data.name,
      data.regionID,
      data.state,
      data.smartDRStatus,
      data.allowAllTraffic,
      data.firewallRanges,
      { ...data.updateWindow, day: updateWindowDaysMap[data.updateWindow.day]! },
      new Date(data.createdAt),
      data.expiresAt ? new Date(data.expiresAt) : undefined,
      data.terminatedAt ? new Date(data.terminatedAt) : undefined,
    );
  }

  async create(body: CreateWorkspaceGroupBody) {
    const response = await this._execute<{ workspaceGroup: WorkspaceGroupSchema }>("", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return this._create(response.workspaceGroup);
  }

  async get<
    T extends [where?: { id: WorkspaceGroupSchema["workspaceGroupID"] }] | [params?: { includeTerminated?: boolean }],
    _ReturnType = T[0] extends { id: WorkspaceGroupSchema["workspaceGroupID"] } ? WorkspaceGroup | undefined : WorkspaceGroup[],
  >(...[arg]: T): Promise<_ReturnType> {
    let url = "";
    const params = new URLSearchParams();

    if (arg && "id" in arg) {
      url = `${url}/${arg.id}`;
    } else if (arg && "includeTerminated" in arg) {
      params.set("includeTerminated", String(arg.includeTerminated));
    }

    type Response = T[0] extends { id: WorkspaceGroupSchema["workspaceGroupID"] }
      ? WorkspaceGroupSchema
      : WorkspaceGroupSchema[];
    const response = await this._execute<Response>(`${url}?${params.toString()}`);

    if (Array.isArray(response)) {
      return response.map((data) => this._create(data)) as _ReturnType;
    }

    return this._create(response) as _ReturnType;
  }

  async delete(id: WorkspaceGroupSchema["workspaceGroupID"], ...args: Parameters<WorkspaceGroup["delete"]>) {
    return WorkspaceGroup.delete(this._api, id, ...args);
  }
}
