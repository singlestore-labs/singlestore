import type { WorkspaceGroupSchema } from "..";
import type { API } from "../../api";

import { APIManager } from "../../api/manager";

export type WorkspaceGroupStageContent = string | any[];

export interface WorkspaceGroupStageSchema {
  name: string;
  content: WorkspaceGroupStageContent;
  type: "json" | "directory" | null;
  path: string;
  format: string | null;
  mimetype: string | null;
  size: number;
  writable: boolean;
  created: string;
  last_modified: string;
}

export interface UpdateWorkspaceGroupStageBody {
  newPath?: WorkspaceGroupStageSchema["path"];
}

export class WorkspaceGroupStage extends APIManager {
  protected _baseUrl: string;

  constructor(
    api: API,
    private _id: WorkspaceGroupSchema["workspaceGroupID"],
    public name: WorkspaceGroupStageSchema["name"],
    public content: WorkspaceGroupStageSchema["content"],
    public type: WorkspaceGroupStageSchema["type"],
    public path: WorkspaceGroupStageSchema["path"],
    public format: WorkspaceGroupStageSchema["format"],
    public mimetype: WorkspaceGroupStageSchema["mimetype"],
    public size: WorkspaceGroupStageSchema["size"],
    public writable: WorkspaceGroupStageSchema["writable"],
    public createdAt: Date | undefined,
    public modifiedAt: Date | undefined,
  ) {
    super(api);
    this._baseUrl = `/stage/${this._id}/fs${this.path}`;
  }

  static async update(
    api: API,
    id: WorkspaceGroupSchema["workspaceGroupID"],
    path: WorkspaceGroupStageSchema["path"],
    body: UpdateWorkspaceGroupStageBody,
  ) {
    return api.execute<Pick<WorkspaceGroupStage, "name" | "path">>(`/stage/${id}/fs${encodeURIComponent(path)}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...body,
        newPath: body.newPath ? encodeURIComponent(body.newPath) : undefined,
      }),
    });
  }

  static async delete(api: API, id: WorkspaceGroupSchema["workspaceGroupID"], path: WorkspaceGroupStage["path"]) {
    return api.execute<Pick<WorkspaceGroupStage, "name" | "path">>(`/stage/${id}/fs${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  }

  async update(body: UpdateWorkspaceGroupStageBody) {
    return WorkspaceGroupStage.update(this._api, this._id, this.path, body);
  }

  async delete() {
    return WorkspaceGroupStage.delete(this._api, this._id, this.path);
  }
}
