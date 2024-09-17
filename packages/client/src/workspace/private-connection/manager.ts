import { URLSearchParams } from "url";

import type { PrivateConnectionSchema } from "../../private-connection";
import type { WorkspaceSchema } from "../workspace";

import { type API, APIManager } from "../../api";

export interface GetWorkspacePrivateConnectionParams<TIsKai extends boolean | undefined> {
  isKai?: TIsKai;
}

export class WorkspacePrivateConnectionManager extends APIManager {
  protected _baseURL: string;

  constructor(
    api: API,
    private _workspaceID: WorkspaceSchema["workspaceID"],
    private _groupID: WorkspaceSchema["workspaceGroupID"],
  ) {
    super(api);
    this._baseURL = WorkspacePrivateConnectionManager.getBaseURL(this._workspaceID);
  }

  static getBaseURL(workspaceID: WorkspaceSchema["workspaceID"]) {
    return `/workspaces/${workspaceID}/privateConnections`;
  }

  async get<TIsKai extends boolean | undefined = undefined>(params?: GetWorkspacePrivateConnectionParams<TIsKai>) {
    const searchParams = new URLSearchParams({ workspaceGroupID: this._groupID });
    return this._execute<TIsKai extends undefined ? PrivateConnectionSchema[] : { serviceName: string }>(
      `${params?.isKai ? "/kai" : ""}?${searchParams.toString()}`,
    );
  }

  async outbundAllowList() {
    return this._execute<{ outboundAllowList: string }[]>("/outbundAllowList");
  }
}
