import { API } from "../../api";
import { APIManager } from "../../api/manager";

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

export class Workspace extends APIManager {
  protected _baseUrl: string;

  constructor(
    api: API,
    public id: WorkspaceSchema["workspaceID"],
    public groupID: WorkspaceSchema["workspaceGroupID"],
    public name: WorkspaceSchema["name"],
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
    this._baseUrl = `/workspaces/${this.id}`;
  }

  static async delete(api: API, id: WorkspaceSchema["workspaceID"]): Promise<WorkspaceSchema["workspaceID"]> {
    const response = await api.execute<Pick<WorkspaceSchema, "workspaceID">>(`/workspaces/${id}`, {
      method: "DELETE",
    });

    return response.workspaceID;
  }

  async delete() {
    return Workspace.delete(this._api, this.id);
  }
}
