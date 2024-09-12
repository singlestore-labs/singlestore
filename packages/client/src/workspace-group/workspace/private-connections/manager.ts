import type { WorkspaceSchema } from "..";
import type { API } from "../../../api";
import type { PrivateConnectionSchema } from "../../../private-connection";

import { APIManager } from "../../../api/manager";

export interface GetWorkspacePrivateConnectionParams<TIsKai extends boolean | undefined> {
  isKai?: TIsKai;
}

export class WorkspacePrivateConnectionsManager extends APIManager {
  protected _baseURL: string;

  constructor(
    api: API,
    private _workspaceID: WorkspaceSchema["workspaceID"],
  ) {
    super(api);
    this._baseURL = WorkspacePrivateConnectionsManager.getBaseURL(this._workspaceID);
  }

  static getBaseURL(workspaceID: WorkspaceSchema["workspaceID"]) {
    return `/workspaces/${workspaceID}/privateConnections`;
  }

  // TODO: Fix `query parameter (workspaceGroupID) should be specified\n`
  async get<TIsKai extends boolean | undefined = undefined>(params?: GetWorkspacePrivateConnectionParams<TIsKai>) {
    return this._execute<TIsKai extends undefined ? PrivateConnectionSchema[] : { serviceName: string }>(
      params?.isKai ? "/kai" : "",
    );
  }

  async outbundAllowList() {
    return this._execute<{ outboundAllowList: string }[]>("/outbundAllowList");
  }
}
