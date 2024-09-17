import type { WorkspaceGroupSchema } from "../workspace-group";
import type { Tail } from "@repo/utils";
import type { AnyAI } from "@singlestore/ai";

import { APIManager, type API } from "../api";

import { type WorkspaceSchema, type UpdateWorkspaceBody, Workspace } from "./workspace";

interface CreateWorkspaceBody
  extends Pick<WorkspaceSchema, "name">,
    Partial<Pick<WorkspaceSchema, "cacheConfig" | "scaleFactor" | "size">>,
    Pick<UpdateWorkspaceBody, "enableKai" | "autoSuspend"> {}

export type GetWorkspaceSelectParam = (keyof WorkspaceSchema)[] | undefined;

export type GetWorkspaceWhereParam = { id: WorkspaceSchema["workspaceID"] } | { name: WorkspaceSchema["name"] } | undefined;

export interface GetWorkspaceParams<
  TSelect extends GetWorkspaceSelectParam = undefined,
  TWhere extends GetWorkspaceWhereParam = undefined,
> {
  select?: TSelect;
  where?: TWhere;
  includeTerminated?: boolean;
}

type WorkspaceBySelect<TSelect extends GetWorkspaceSelectParam> = TSelect extends (keyof Workspace<any, any>)[]
  ? Pick<Workspace<any, any>, TSelect[number]>
  : Workspace<any, any>;

export class WorkspaceManager<TAI extends AnyAI | undefined> extends APIManager {
  protected _baseURL: string = "/workspaces";

  constructor(
    api: API,
    private _ai: TAI,
    private _workspaceGroupID: WorkspaceGroupSchema["workspaceGroupID"],
  ) {
    super(api);
  }

  private _create(data: WorkspaceSchema) {
    return new Workspace(
      this._api,
      this._ai,
      data.workspaceID,
      data.workspaceGroupID,
      data.name,
      data.endpoint,
      data.size,
      data.state,
      data.scaleFactor,
      data.scalingProgress,
      data.cacheConfig,
      data.kaiEnabled,
      data.deploymentType,
      new Date(data.createdAt),
      data.lastResumedAt ? new Date(data.lastResumedAt) : undefined,
      data.terminatedAt ? new Date(data.terminatedAt) : undefined,
      data.autoSuspend
        ? {
            ...data.autoSuspend,
            idleChangedAt: data.autoSuspend.idleChangedAt ? new Date(data.autoSuspend.idleChangedAt) : undefined,
            scheduledChangedAt: data.autoSuspend.scheduledChangedAt ? new Date(data.autoSuspend.scheduledChangedAt) : undefined,
            scheduledSuspendAt: data.autoSuspend.scheduledSuspendAt ? new Date(data.autoSuspend.scheduledSuspendAt) : undefined,
            suspendTypeChangedAt: data.autoSuspend.suspendTypeChangedAt
              ? new Date(data.autoSuspend.suspendTypeChangedAt)
              : undefined,
          }
        : undefined,
      data.resumeAttachments?.map(({ attachment: type, ...attachment }) => ({ ...attachment, type })),
    );
  }

  async create(body: CreateWorkspaceBody) {
    const response = await this._execute<Pick<WorkspaceSchema, "workspaceID">>("", {
      method: "POST",
      body: JSON.stringify({ ...body, workspaceGroupID: this._workspaceGroupID }),
    });

    if (typeof response === "string") {
      throw new Error(response);
    }

    return this.get({ where: { id: response.workspaceID } });
  }

  async get<
    TSelect extends GetWorkspaceSelectParam = undefined,
    TWhere extends GetWorkspaceWhereParam = undefined,
    _TReturnType = TWhere extends { id: WorkspaceSchema["workspaceID"] }
      ? WorkspaceBySelect<TSelect> | undefined
      : WorkspaceBySelect<TSelect>[],
  >({ where, select, includeTerminated }: GetWorkspaceParams<TSelect, TWhere> = {}): Promise<_TReturnType> {
    let url = "";

    const searchParams = new URLSearchParams({
      workspaceGroupID: this._workspaceGroupID,
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

    const response = await this._execute<TWhere extends undefined ? WorkspaceSchema[] : WorkspaceSchema>(
      `${url}?${searchParams.toString()}`,
    );

    if (Array.isArray(response)) {
      return response
        .filter((data) => (where && "name" in where ? data.name === where.name : true))
        .map((data) => this._create(data)) as _TReturnType;
    }

    return this._create(response) as _TReturnType;
  }

  async update(...args: Tail<Parameters<typeof Workspace.update>>) {
    return Workspace.update(this._api, ...args);
  }

  async delete(...args: Tail<Parameters<typeof Workspace.delete>>) {
    return Workspace.delete(this._api, ...args);
  }

  async resume(...args: Tail<Parameters<typeof Workspace.resume>>) {
    return Workspace.resume(this._api, ...args);
  }

  async suspend(...args: Tail<Parameters<typeof Workspace.suspend>>) {
    return Workspace.suspend(this._api, ...args);
  }

  async getState(...args: Tail<Parameters<typeof Workspace.getState>>) {
    return Workspace.getState(this._api, ...args);
  }
}
