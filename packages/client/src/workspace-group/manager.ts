import { getKeyByValue } from "@repo/utils";

import type { RegionName } from "../region";
import type { RegionManager } from "../region/manager";

import { type API } from "../api";
import { APIManager } from "../api/manager";

import {
  WorkspaceGroup,
  type WorkspaceGroupUpdateWindow,
  type WorkspaceGroupSchema,
  WorkspaceGroupUpdateWindowSchema,
} from ".";

export interface CreateWorkspaceGroupBody {
  name: WorkspaceGroupSchema["name"];
  adminPassword?: string;
  allowAllTraffic?: boolean;
  firewallRanges?: string[];
  regionName: RegionName;
  updateWindow?: WorkspaceGroupUpdateWindow;
  dataBucketKMSKeyID?: string;
  backupBucketKMSKeyID?: string;
  expiresAt?: Date;
}

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

  constructor(
    protected readonly _api: API,
    private _region: RegionManager,
  ) {
    super(_api);
  }

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

  async create({ regionName, firewallRanges = [], ...body }: CreateWorkspaceGroupBody) {
    const region = await this._region.get({ name: regionName });
    if (!region) {
      throw new Error("Region not found with the given name. Please provide a valid region name.");
    }

    let updateWindow: WorkspaceGroupUpdateWindowSchema | undefined;
    if (body.updateWindow) {
      const day = getKeyByValue(updateWindowDaysMap, body.updateWindow.day);
      if (!day) {
        throw new Error(
          `Day not found with the given name. Please provide a valid day from the following list: ${Object.values(updateWindowDaysMap).join(", ")}.`,
        );
      }

      updateWindow = { ...body.updateWindow, day: Number(day) };
    }

    const response = await this._execute<
      Pick<WorkspaceGroupSchema, "workspaceGroupID"> & { adminPassword: string | undefined }
    >("", {
      method: "POST",
      body: JSON.stringify({ ...body, firewallRanges, updateWindow, regionID: region.id }),
    });

    const newWorkspaceGroup = await this._execute<WorkspaceGroupSchema>(`/${response.workspaceGroupID}`);

    return {
      workspaceGroup: this._create(newWorkspaceGroup),
      adminPassword: body.adminPassword || response.adminPassword,
    };
  }

  async get<
    T extends
      | [where?: { id: WorkspaceGroupSchema["workspaceGroupID"] } | { name: WorkspaceGroupSchema["name"] }]
      | [params?: { includeTerminated?: boolean }],
    _ReturnType = T[0] extends { id: WorkspaceGroupSchema["workspaceGroupID"] } ? WorkspaceGroup | undefined : WorkspaceGroup[],
  >(...[arg]: T): Promise<_ReturnType> {
    let url = "";
    const params = new URLSearchParams();

    if (arg && "id" in arg) {
      url = `${url}/${arg.id}`;
    } else if (arg && "name" in arg) {
      params.set("includeTerminated", String(true));
    } else if (arg && "includeTerminated" in arg) {
      params.set("includeTerminated", String(arg.includeTerminated));
    }

    type Response = T[0] extends { id: WorkspaceGroupSchema["workspaceGroupID"] }
      ? WorkspaceGroupSchema
      : WorkspaceGroupSchema[];
    const response = await this._execute<Response>(`${url}?${params.toString()}`);

    if (Array.isArray(response)) {
      if (arg && "name" in arg) {
        return response.filter(({ name }) => name === arg.name).map((data) => this._create(data)) as _ReturnType;
      }

      return response.map((data) => this._create(data)) as _ReturnType;
    }

    return this._create(response) as _ReturnType;
  }

  async delete(id: WorkspaceGroupSchema["workspaceGroupID"], ...args: Parameters<WorkspaceGroup["delete"]>) {
    return WorkspaceGroup.delete(this._api, id, ...args);
  }
}
