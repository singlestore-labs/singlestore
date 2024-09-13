import type { API } from "../api";

import { APIManager } from "../api/manager";

export interface JobRuntime {
  name: "notebooks-cpu-small" | "notebooks-cpu-medium" | "notebooks-gpu-t4";
  description: string;
}

export interface JobMetadata {
  count: number;
  avgDurationInSeconds: number | null;
  maxDurationInSeconds: number | null;
  status: "Unknown" | "Scheduled" | "Running" | "Completed" | "Failed" | "Error" | "Canceled";
}

export interface JobScheduleSchema {
  mode: "Recurring" | "Once";
  startAt: string | null;
  executionIntervalInMinutes: number | null;
}

export interface JobSchedule extends Omit<JobScheduleSchema, "startAt"> {
  startAt: Date | null;
}

export interface JobTargetConfig {
  targetID: string;
  targetType: "Workspace" | "Cluster" | "VirtualWorkspace";
  resumeTarget: boolean;
  databaseName: string;
}

export interface JobExecutionConfig {
  notebookPath: string;
  createSnapshot: boolean;
  maxAllowedExecutionDurationInMinutes: number;
}

export interface JobSchema {
  jobID: string;
  name: string;
  description: string | null;
  enqueuedBy: string;
  jobMetadata: JobMetadata[];
  schedule: JobScheduleSchema;
  targetConfig: JobTargetConfig;
  executionConfig: JobExecutionConfig;
  completedExecutionsCount: number;
  createdAt: string;
  terminatedAt: string | null;
}

export interface JobParameter {
  type: "string" | "integer" | "float" | "boolean";
  name: string;
  value: string;
}

export interface JobExecutionSchema {
  id: string;
  number: number;
  jobID: string;
  scheduledStartTime: string;
  startedAt: string | null;
  finishedAt: string | null;
  snapshotNotebookPath: string | null;
  status: "Scheduled" | "Running" | "Completed" | "Failed";
}
export interface JobExecution extends Omit<JobExecutionSchema, "scheduledStartTime" | "startedAt" | "finishedAt"> {
  scheduledStartTime: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export class Job extends APIManager {
  protected _baseURL: string;

  constructor(
    _api: API,
    public id: JobSchema["jobID"],
    public name: JobSchema["name"],
    public description: JobSchema["description"],
    public enqueuedBy: JobSchema["enqueuedBy"],
    public executionConfig: JobSchema["executionConfig"],
    public metadata: JobSchema["jobMetadata"],
    public targetConfig: JobSchema["targetConfig"],
    public completedExecutionsCount: JobSchema["completedExecutionsCount"],
    public schedule: JobSchedule,
    public createdAt: Date,
    public terminatedAt: Date | null,
  ) {
    super(_api);
    this._baseURL = Job.getBaseURL(this.id);
  }

  static getBaseURL(id: JobSchema["jobID"]) {
    return `/jobs/${id}`;
  }

  static async delete(api: API, id: JobSchema["jobID"]): Promise<boolean> {
    return api.execute<boolean>(this.getBaseURL(id), { method: "DELETE" });
  }

  static async getExecutions(api: API, id: JobSchema["jobID"], start: number, end: number): Promise<JobExecution[]> {
    const params = new URLSearchParams({ start: start.toString(), end: end.toString() });
    const response = await api.execute(`${this.getBaseURL(id)}/executions?${params.toString()}`);
    return response.executions.map((execution: any) => {
      return {
        id: execution.executionID,
        number: execution.executionNumber,
        jobID: execution.jobID,
        scheduledStartTime: new Date(execution.scheduledStartTime),
        startedAt: new Date(execution.startedAt),
        finishedAt: new Date(execution.finishedAt),
        snapshotNotebookPath: execution.snapshotNotebookPath,
        status: execution.status,
      } satisfies JobExecution;
    });
  }

  static async getParameters(api: API, id: JobSchema["jobID"]): Promise<JobParameter[]> {
    return api.execute<JobParameter[]>(`${this.getBaseURL(id)}/parameters`);
  }

  async delete() {
    return Job.delete(this._api, this.id);
  }

  async getExecutions(start: number, end: number) {
    return Job.getExecutions(this._api, this.id, start, end);
  }

  async getParameters() {
    return Job.getParameters(this._api, this.id);
  }
}
