import type { OrganizationManager } from "../organization/manager";
import type { RegionName } from "../region";
import type { RegionManager } from "../region/manager";
import type { Tail } from "@repo/utils";
import type { AnyAI } from "@singlestore/ai";

import { type API } from "../api";
import { APIManager } from "../api/manager";

import { WorkspaceGroup, type WorkspaceGroupUpdateWindow, type WorkspaceGroupSchema, updateWindowDaysMap } from ".";

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

export type GetWorkspaceGroupSelectParam = (keyof WorkspaceGroupSchema)[] | undefined;

export type GetWorkspaceGroupWhereParam =
  | { id: WorkspaceGroupSchema["workspaceGroupID"] }
  | { name: WorkspaceGroupSchema["name"] }
  | undefined;

export interface GetWorkspaceGroupParams<
  TSelect extends GetWorkspaceGroupSelectParam = undefined,
  TWhere extends GetWorkspaceGroupWhereParam = undefined,
> {
  select?: TSelect;
  where?: TWhere;
  includeTerminated?: boolean;
}

type WorkspaceGroupBySelect<TSelect extends GetWorkspaceGroupSelectParam> = TSelect extends (keyof WorkspaceGroup<any>)[]
  ? Pick<WorkspaceGroup<any>, TSelect[number]>
  : WorkspaceGroup<any>;

export class WorkspaceGroupManager<TAI extends AnyAI | undefined> extends APIManager {
  protected _baseURL: string = "/workspaceGroups";

  constructor(
    _api: API,
    private _ai: TAI,
    private _organization: OrganizationManager,
    private _region: RegionManager,
  ) {
    super(_api);
  }

  private _create(data: WorkspaceGroupSchema): WorkspaceGroup<TAI> {
    return new WorkspaceGroup(
      this._api,
      this._ai,
      this._organization,
      data.workspaceGroupID,
      data.name,
      data.regionID,
      data.state,
      data.smartDRStatus,
      data.allowAllTraffic,
      data.firewallRanges,
      data.updateWindow ? { ...data.updateWindow, day: updateWindowDaysMap[data.updateWindow.day]! } : undefined,
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

    const updateWindow = body.updateWindow ? WorkspaceGroup.serializeUpdateWindow(body.updateWindow) : undefined;

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
    TSelect extends GetWorkspaceGroupSelectParam = undefined,
    TWhere extends GetWorkspaceGroupWhereParam = undefined,
    _TReturnType = TWhere extends { id: WorkspaceGroupSchema["workspaceGroupID"] }
      ? WorkspaceGroupBySelect<TSelect> | undefined
      : WorkspaceGroupBySelect<TSelect>[],
  >({ where, select, includeTerminated }: GetWorkspaceGroupParams<TSelect, TWhere> = {}): Promise<_TReturnType> {
    let url = "";

    const searchParams = new URLSearchParams({
      includeTerminated: includeTerminated ? String(includeTerminated) : String(false),
    });

    if (where) {
      if ("id" in where) {
        url = `${url}/${where.id}`;
      }
    }

    if (select?.length) {
      searchParams.set("fields", select.join(","));
    }

    const response = await this._execute<TWhere extends undefined ? WorkspaceGroupSchema[] : WorkspaceGroupSchema>(
      `${url}?${searchParams.toString()}`,
    );

    if (Array.isArray(response)) {
      return response
        .filter((data) => (where && "name" in where ? data.name === where.name : true))
        .map((data) => this._create(data)) as _TReturnType;
    }

    return this._create(response) as _TReturnType;
  }

  async update(...args: Tail<Parameters<typeof WorkspaceGroup.update>>) {
    return WorkspaceGroup.update(this._api, ...args);
  }

  async delete(...args: Tail<Parameters<typeof WorkspaceGroup.delete>>) {
    return WorkspaceGroup.delete(this._api, ...args);
  }
}
