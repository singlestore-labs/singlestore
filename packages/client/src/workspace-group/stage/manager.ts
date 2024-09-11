import type { WorkspaceGroupSchema } from "..";
import type { API } from "../../api";

import { APIManager } from "../../api/manager";

import { type UpdateWorkspaceGroupStageBody, type WorkspaceGroupStageSchema, WorkspaceGroupStage } from ".";

export class WorkspaceGroupStageManager extends APIManager {
  protected _baseUrl: string;

  constructor(
    api: API,
    private _workspaceGroupID: WorkspaceGroupSchema["workspaceGroupID"],
  ) {
    super(api);
    this._baseUrl = `/stage/${this._workspaceGroupID}/fs`;
  }

  async get(path?: WorkspaceGroupStageSchema["path"]) {
    return WorkspaceGroupStage.get(this._api, this._workspaceGroupID, path);
  }

  async update(path: WorkspaceGroupStageSchema["path"], body: UpdateWorkspaceGroupStageBody) {
    return WorkspaceGroupStage.update(this._api, this._workspaceGroupID, path, body);
  }

  async delete(path: WorkspaceGroupStageSchema["path"]) {
    return WorkspaceGroupStage.delete(this._api, this._workspaceGroupID, path);
  }

  async createFolder(path: WorkspaceGroupStage["path"], name: string) {
    return WorkspaceGroupStage.createFolder(this._api, this._workspaceGroupID, path, name);
  }
}
