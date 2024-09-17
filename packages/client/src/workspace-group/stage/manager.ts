import type { WorkspaceGroupSchema } from "../workspace-group";

import { type API, APIManager } from "../../api";

import { WorkspaceGroupStage } from "./stage";

export class WorkspaceGroupStageManager extends APIManager {
  protected _baseURL: string;

  constructor(
    api: API,
    private _workspaceGroupID: WorkspaceGroupSchema["workspaceGroupID"],
  ) {
    super(api);
    this._baseURL = WorkspaceGroupStageManager.getBaseURL(this._workspaceGroupID);
  }

  static getBaseURL(workspaceGroupID: WorkspaceGroupSchema["workspaceGroupID"]) {
    return `/stage/${workspaceGroupID}/fs`;
  }

  async get(...args: Parameters<typeof WorkspaceGroupStage.get> extends [any, any, ...infer Rest] ? Rest : never) {
    return WorkspaceGroupStage.get(this._api, this._workspaceGroupID, ...args);
  }

  async update(...args: Parameters<typeof WorkspaceGroupStage.update> extends [any, any, ...infer Rest] ? Rest : never) {
    return WorkspaceGroupStage.update(this._api, this._workspaceGroupID, ...args);
  }

  async delete(...args: Parameters<typeof WorkspaceGroupStage.delete> extends [any, any, ...infer Rest] ? Rest : never) {
    return WorkspaceGroupStage.delete(this._api, this._workspaceGroupID, ...args);
  }

  async createFolder(
    ...args: Parameters<typeof WorkspaceGroupStage.createFolder> extends [any, any, ...infer Rest] ? Rest : never
  ) {
    return WorkspaceGroupStage.createFolder(this._api, this._workspaceGroupID, ...args);
  }
}
