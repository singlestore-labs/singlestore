import type { WorkspaceGroupSchema } from "..";
import type { API } from "../../api";

import { APIManager } from "../../api/manager";

import { type ResumeWorkspaceBody, type UpdateWorkspaceBody, Workspace, type WorkspaceSchema } from ".";

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

type WorkspaceBySelect<TSelect extends GetWorkspaceSelectParam> = TSelect extends (keyof Workspace)[]
  ? Pick<Workspace, TSelect[number]>
  : Workspace;

export class WorkspaceManager extends APIManager {
  protected _baseURL: string = "/workspaces";

  constructor(
    api: API,
    private _workspaceGroupID: WorkspaceGroupSchema["workspaceGroupID"],
  ) {
    super(api);
  }

  private _create(data: WorkspaceSchema) {
    return new Workspace(
      this._api,
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

  async update(id: WorkspaceSchema["workspaceID"], body: UpdateWorkspaceBody) {
    return Workspace.update(this._api, id, body);
  }

  async delete(id: WorkspaceSchema["workspaceID"]) {
    return Workspace.delete(this._api, id);
  }

  async resume(id: WorkspaceSchema["workspaceID"], body?: ResumeWorkspaceBody) {
    return Workspace.resume(this._api, id, body);
  }

  async suspend(id: WorkspaceSchema["workspaceID"]) {
    return Workspace.suspend(this._api, id);
  }

  async getState(id: WorkspaceSchema["workspaceID"]) {
    return Workspace.getState(this._api, id);
  }
}
