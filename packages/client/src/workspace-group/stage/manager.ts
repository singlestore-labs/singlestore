import type { WorkspaceGroupSchema } from "..";
import type { API } from "../../api";

import { APIManager } from "../../api/manager";

import { type UpdateWorkspaceGroupStageBody, WorkspaceGroupStage, type WorkspaceGroupStageSchema } from ".";

export class WorkspaceGroupStageManager extends APIManager {
  protected _baseUrl: string;

  constructor(
    api: API,
    private _id: WorkspaceGroupSchema["workspaceGroupID"],
  ) {
    super(api);
    this._baseUrl = `/stage/${this._id}/fs`;
  }

  async get(path?: WorkspaceGroupStageSchema["path"]) {
    const respnose = await this._execute<WorkspaceGroupStageSchema>(path ? WorkspaceGroupStage.serializePath(path) : undefined);

    if (!respnose.path) {
      throw new Error(`No stage found with the specified path: ${path}`);
    }

    return new WorkspaceGroupStage(
      this._api,
      this._id,
      respnose.name,
      respnose.content,
      respnose.type,
      respnose.path,
      respnose.format,
      respnose.mimetype,
      respnose.size,
      respnose.writable,
      respnose.created ? new Date(respnose.created) : undefined,
      respnose.last_modified ? new Date(respnose.last_modified) : undefined,
    );
  }

  async update(body: UpdateWorkspaceGroupStageBody, path: WorkspaceGroupStageSchema["path"]) {
    return WorkspaceGroupStage.update(this._api, this._id, path, body);
  }

  async delete(path: WorkspaceGroupStageSchema["path"]) {
    return WorkspaceGroupStage.delete(this._api, this._id, path);
  }

  async createFolder(name: string, path: WorkspaceGroupStage["path"]) {
    return WorkspaceGroupStage.createFolder(this._api, this._id, path, name);
  }
}
