import type { AnyAI } from "@singlestore/ai";

import { APIManager, type API } from "../api";

import { type CreateWorkspaceConnectionConfig, WorkspaceConnection } from "./connection";
import { WorkspacePrivateConnectionManager } from "./private-connection";

export type WorkspaceSize = "S-00";

export interface WorkspaceResumeAttachmentSchema {
  attachment: "READWRITE" | "READONLY";
  database: string;
  error: string;
  success: boolean;
}

export interface WorkspaceResumeAttachment extends Omit<WorkspaceResumeAttachmentSchema, "attachment"> {
  type: WorkspaceResumeAttachmentSchema["attachment"];
}

export interface WorkspaceAutoSuspendSchema {
  suspendType: "IDLE" | "SCHEDULED";
  idleAfterSeconds: number;
  idleChangedAt: string | undefined;
  scheduledChangedAt: string | undefined;
  scheduledSuspendAt: string | undefined;
  suspendTypeChangedAt: string | undefined;
}

export interface WorkspaceAutoSuspend
  extends Omit<
    WorkspaceAutoSuspendSchema,
    "idleChangedAt" | "scheduledChangedAt" | "scheduledSuspendAt" | "suspendTypeChangedAt"
  > {
  idleChangedAt: Date | undefined;
  scheduledChangedAt: Date | undefined;
  scheduledSuspendAt: Date | undefined;
  suspendTypeChangedAt: Date | undefined;
}

export interface WorkspaceSchema {
  workspaceID: string;
  workspaceGroupID: string;
  name: string;
  endpoint: string;
  size: WorkspaceSize;
  state: "ACTIVE" | "PENDING" | "SUSPENDED" | "FAILED" | "TERMINATED";
  scaleFactor: 1 | 2 | 4;
  scalingProgress: number | undefined;
  cacheConfig: 1 | 2 | 4;
  kaiEnabled: boolean;
  deploymentType: "PRODUCTION" | "NON-PRODUCTION";
  createdAt: string;
  lastResumedAt: string | undefined;
  terminatedAt: string | undefined;
  autoSuspend: WorkspaceAutoSuspendSchema | undefined;
  resumeAttachments: WorkspaceResumeAttachmentSchema[];
}

export interface UpdateWorkspaceBody
  extends Partial<Pick<WorkspaceSchema, "size" | "deploymentType" | "cacheConfig" | "scaleFactor">> {
  enableKai?: boolean;
  autoSuspend?: {
    suspendType?: WorkspaceAutoSuspendSchema["suspendType"] | "DISABLED";
    suspendAfterSeconds?: number;
  };
}

export interface ResumeWorkspaceBody {
  disableAutoSuspend?: boolean;
}

export interface ConnectWorkspaceConfig<TName extends WorkspaceSchema["name"] | undefined, TAI extends AnyAI | undefined>
  extends Omit<CreateWorkspaceConnectionConfig<TName, TAI>, "name" | "host" | "ai"> {}

export class Workspace<TName extends WorkspaceSchema["name"], TAI extends AnyAI | undefined> extends APIManager {
  protected _baseURL: string;
  privateConnection: WorkspacePrivateConnectionManager;

  constructor(
    api: API,
    private _ai: TAI,
    public id: WorkspaceSchema["workspaceID"],
    public groupID: WorkspaceSchema["workspaceGroupID"],
    public name: TName,
    public endpoint: WorkspaceSchema["endpoint"],
    public size: WorkspaceSchema["size"],
    public state: WorkspaceSchema["state"],
    public scaleFactor: WorkspaceSchema["scaleFactor"],
    public scalingProgress: WorkspaceSchema["scalingProgress"],
    public cacheConfig: WorkspaceSchema["cacheConfig"],
    public kaiEnabled: WorkspaceSchema["kaiEnabled"],
    public deploymentType: WorkspaceSchema["deploymentType"],
    public createdAt: Date,
    public lastResumedAt: Date | undefined,
    public terminatedAt: Date | undefined,
    public autoSuspend: WorkspaceAutoSuspend | undefined,
    public resumeAttachments: WorkspaceResumeAttachment[] | undefined,
  ) {
    super(api);
    this._baseURL = Workspace.getBaseURL(this.id);
    this.privateConnection = new WorkspacePrivateConnectionManager(this._api, this.id, this.groupID);
  }

  static getBaseURL(id: WorkspaceSchema["workspaceID"]) {
    return `/workspaces/${id}`;
  }

  static async update(
    api: API,
    id: WorkspaceSchema["workspaceID"],
    body: UpdateWorkspaceBody,
  ): Promise<WorkspaceSchema["workspaceID"]> {
    const response = await api.execute<Pick<WorkspaceSchema, "workspaceID">>(this.getBaseURL(id), {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    return response.workspaceID;
  }

  static async delete(api: API, id: WorkspaceSchema["workspaceID"]): Promise<WorkspaceSchema["workspaceID"]> {
    const response = await api.execute<Pick<WorkspaceSchema, "workspaceID">>(this.getBaseURL(id), {
      method: "DELETE",
    });

    return response.workspaceID;
  }

  static async resume(
    api: API,
    id: WorkspaceSchema["workspaceID"],
    body: ResumeWorkspaceBody = {},
  ): Promise<WorkspaceSchema["workspaceID"]> {
    const response = await api.execute<Pick<WorkspaceSchema, "workspaceID">>(`${this.getBaseURL(id)}/resume`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return response.workspaceID;
  }

  static async suspend(api: API, id: WorkspaceSchema["workspaceID"]): Promise<WorkspaceSchema["workspaceID"]> {
    const response = await api.execute<Pick<WorkspaceSchema, "workspaceID">>(`${this.getBaseURL(id)}/suspend`, {
      method: "POST",
    });

    return response.workspaceID;
  }

  static async getState(api: API, id: WorkspaceSchema["workspaceID"]): Promise<WorkspaceSchema["state"]> {
    const searchParams = new URLSearchParams({ fields: "state" });
    const respone = await api.execute<Pick<WorkspaceSchema, "state">>(`${this.getBaseURL(id)}?${searchParams.toString()}`);
    return respone.state;
  }

  connect(config: ConnectWorkspaceConfig<TName, TAI>) {
    return WorkspaceConnection.create({ ...config, name: this.name, ai: this._ai, host: this.endpoint });
  }

  async update(body: UpdateWorkspaceBody) {
    return Workspace.update(this._api, this.id, body);
  }

  async delete() {
    return Workspace.delete(this._api, this.id);
  }

  async resume(body?: ResumeWorkspaceBody) {
    return Workspace.resume(this._api, this.id, body);
  }

  async suspend() {
    return Workspace.suspend(this._api, this.id);
  }

  async getState() {
    return Workspace.getState(this._api, this.id);
  }
}
