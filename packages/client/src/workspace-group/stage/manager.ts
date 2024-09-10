import type { WorkspaceGroupSchema } from "..";
import type { API } from "../../api";

import { APIManager } from "../../api/manager";

import { WorkspaceGroupStage, type WorkspaceGroupStageSchema } from ".";

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
    const { created, last_modified, ...respnose } = await this._execute<WorkspaceGroupStageSchema>(
      path ? encodeURIComponent(path) : undefined,
    );

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
      created ? new Date(created) : undefined,
      last_modified ? new Date(last_modified) : undefined,
    );
  }

  async update(path: WorkspaceGroupStageSchema["path"], ...args: Parameters<WorkspaceGroupStage["update"]>) {
    return WorkspaceGroupStage.update(this._api, this._id, path, ...args);
  }

  async delete(path: WorkspaceGroupStageSchema["path"]) {
    return WorkspaceGroupStage.delete(this._api, this._id, path);
  }
}
