import type { WorkspaceGroupSchema } from "..";
import type { API } from "../../api";

import { APIManager } from "../../api/manager";

import { Workspace, type WorkspaceSchema } from ".";

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
  protected _baseUrl: string = "/workspaces";

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

  async get<
    TSelect extends GetWorkspaceSelectParam = undefined,
    TWhere extends GetWorkspaceWhereParam = undefined,
    _TReturnType = TWhere extends undefined ? WorkspaceBySelect<TSelect>[] : WorkspaceBySelect<TSelect> | undefined,
  >({ where, select, includeTerminated }: GetWorkspaceParams<TSelect, TWhere> = {}): Promise<_TReturnType> {
    let url = "";

    const searchParams = new URLSearchParams({
      workspaceGroupID: this._workspaceGroupID,
      includeTerminated: includeTerminated ? String(includeTerminated) : String(false),
    });

    if (where) {
      if ("id" in where) {
        url = `${url}/${where.id}`;
      } else if ("name" in where) {
        searchParams.set("includeTerminated", String(true));
      }
    }

    if (select?.length) {
      searchParams.set("fields", select.join(","));
    }

    const response = await this._execute<TWhere extends undefined ? WorkspaceSchema[] : WorkspaceSchema>(
      `${url}?${searchParams.toString()}`,
    );

    if (Array.isArray(response)) {
      if (where && "name" in where) {
        const data = response.find((data) => data.name === where.name);
        if (!data) return undefined as _TReturnType;
        return this._create(data) as _TReturnType;
      }

      return response.map((data) => this._create(data)) as _TReturnType;
    }

    return this._create(response) as _TReturnType;
  }
}
