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
  protected _baseURL: string;

  constructor(
    api: API,
    private _workspaceGroupID: WorkspaceGroupSchema["workspaceGroupID"],
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
    this._baseURL = WorkspaceGroupStage.getBaseURL(this._workspaceGroupID, this.path);
  }

  static getBaseURL(workspaceGroupID: WorkspaceGroupSchema["workspaceGroupID"], path: WorkspaceGroupStageSchema["path"]) {
    return `/stage/${workspaceGroupID}/fs/${path}`;
  }

  static serializePath(path?: WorkspaceGroupStageSchema["path"]): string {
    if (!path) return "";
    return `/${encodeURIComponent(path.startsWith("/") ? path.substring(1) : path)}`;
  }

  static formatPath(id: WorkspaceGroupSchema["workspaceGroupID"], path?: WorkspaceGroupStageSchema["path"]) {
    return this.getBaseURL(id, this.serializePath(path));
  }

  static mergePaths(...paths: (string | undefined)[]): string {
    return paths.filter(Boolean).join("").replaceAll("//", "/");
  }

  static async get(api: API, id: WorkspaceGroupSchema["workspaceGroupID"], path?: WorkspaceGroupStageSchema["path"]) {
    const response = await api.execute<WorkspaceGroupStageSchema>(this.formatPath(id, path));

    if (!response.path) {
      throw new Error(`No stage found with the specified path: ${path}`);
    }

    return new WorkspaceGroupStage(
      api,
      id,
      response.name,
      response.content,
      response.type,
      response.path,
      response.format,
      response.mimetype,
      response.size,
      response.writable,
      response.created ? new Date(response.created) : undefined,
      response.last_modified ? new Date(response.last_modified) : undefined,
    );
  }

  static async update(
    api: API,
    id: WorkspaceGroupSchema["workspaceGroupID"],
    path: WorkspaceGroupStageSchema["path"],
    body: UpdateWorkspaceGroupStageBody,
  ) {
    const response = await api.execute<Pick<WorkspaceGroupStage, "name" | "path">>(this.formatPath(id, path), {
      method: "PATCH",
      body: JSON.stringify({
        ...body,
        newPath: body.newPath || undefined,
      }),
    });

    if (typeof response === "string") {
      throw new Error(response);
    }

    return response;
  }

  static async delete(api: API, id: WorkspaceGroupSchema["workspaceGroupID"], path: WorkspaceGroupStage["path"]) {
    const response = await api.execute<Pick<WorkspaceGroupStage, "name" | "path">>(this.formatPath(id, path), {
      method: "DELETE",
    });

    if (typeof response === "string") {
      throw new Error(response);
    }

    return response;
  }

  static async createFolder(
    api: API,
    id: WorkspaceGroupSchema["workspaceGroupID"],
    path: WorkspaceGroupStage["path"],
    name: string,
  ) {
    const response = await api.execute<Pick<WorkspaceGroupStage, "name" | "path">>(
      `${this.formatPath(id, path)}${encodeURIComponent(name)}/`,
      { method: "PUT" },
    );

    if (typeof response === "string") {
      throw new Error(response);
    }

    return this.get(api, id, response.path);
  }

  // TODO: Complete this method
  static async uploadFile(
    api: API,
    id: WorkspaceGroupSchema["workspaceGroupID"],
    path: WorkspaceGroupStage["path"],
    file: File,
  ) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.execute(`${this.formatPath(id, path)}/${this.serializePath(file.name)}`, {
      method: "PUT",
      headers: { "Content-Type": "multipart/form-data" },
      body: formData,
    });

    console.log(response);
  }

  async get(path?: WorkspaceGroupStage["path"]) {
    const _path = WorkspaceGroupStage.mergePaths(this.path, path);
    return WorkspaceGroupStage.get(this._api, this._workspaceGroupID, _path);
  }

  async update(body: UpdateWorkspaceGroupStageBody, path?: WorkspaceGroupStage["path"]) {
    const _path = WorkspaceGroupStage.mergePaths(this.path, path);
    return WorkspaceGroupStage.update(this._api, this._workspaceGroupID, _path, body);
  }

  async delete(path?: WorkspaceGroupStage["path"]) {
    const _path = WorkspaceGroupStage.mergePaths(this.path, path);
    return WorkspaceGroupStage.delete(this._api, this._workspaceGroupID, _path);
  }

  async createFolder(name: string, path?: WorkspaceGroupStage["path"]) {
    const _path = WorkspaceGroupStage.mergePaths(this.path, path);
    return WorkspaceGroupStage.createFolder(this._api, this._workspaceGroupID, _path, name);
  }

  async uploadFile(file: File, path?: WorkspaceGroupStage["path"]) {
    const _path = WorkspaceGroupStage.mergePaths(this.path, path);
    return WorkspaceGroupStage.uploadFile(this._api, this._workspaceGroupID, _path, file);
  }
}
