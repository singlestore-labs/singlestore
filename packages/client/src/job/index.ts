import type { API } from "../api";

import { APIManager } from "../api/manager";

export interface JobRuntime {
  name: "notebooks-cpu-small" | "notebooks-cpu-medium" | "notebooks-gpu-t4";
  description: string;
}

export interface JobMetadata {
  avgDurationInSeconds: number | null;
  count: number;
  maxDurationInSeconds: number | null;
  status: "Unknown" | "Scheduled" | "Running" | "Completed" | "Failed" | "Error" | "Canceled";
}

export interface JobSchedule {
  executionIntervalInMinutes: number | null;
  mode: "Recurring" | "Once";
  startAt: Date | null;
}

export interface JobTargetConfig {
  databaseName: string;
  resumeTarget: boolean;
  targetID: string;
  targetType: "Workspace" | "Cluster" | "VirtualWorkspace";
}

export interface JobParameter {
  name: string;
  type: "string" | "integer" | "float" | "boolean";
  value: string;
}

export interface JobExecution {
  id: string;
  number: number;
  jobId: string;
  scheduledStartTime: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  snapshotNotebookPath: string | null;
  status: "Scheduled" | "Running" | "Completed" | "Failed";
}

export interface JobExecutionConfig {
  createSnapshot: boolean;
  maxAllowedExecutionDurationInMinutes: number;
  notebookPath: string;
}

export class Job extends APIManager {
  protected _baseUrl: string;

  constructor(
    _api: API,
    public id: string,
    public name: string | null,
    public description: string | null,
    public enqueuedBy: string,
    public executionConfig: JobExecutionConfig,
    public metadata: JobMetadata[],
    public targetConfig: JobTargetConfig,
    public completedExecutionsCount: number,
    public schedule: JobSchedule,
    public createdAt: Date,
    public terminatedAt: Date | null,
  ) {
    super(_api);
    this._baseUrl = `/jobs/${this.id}`;
  }

  static async drop(api: API, id: string): Promise<boolean> {
    return api.execute<boolean>(`/jobs/${id}`, { method: "DELETE" });
  }

  static async getExecutions(api: API, id: string, start: number, end: number): Promise<JobExecution[]> {
    const params = new URLSearchParams({ start: start.toString(), end: end.toString() });
    const response = await api.execute(`/jobs/${id}/executions?${params.toString()}`);
    return response.executions.map((execution: any) => {
      return {
        id: execution.executionID,
        number: execution.executionNumber,
        jobId: execution.jobID,
        scheduledStartTime: new Date(execution.scheduledStartTime),
        startedAt: new Date(execution.startedAt),
        finishedAt: new Date(execution.finishedAt),
        snapshotNotebookPath: execution.snapshotNotebookPath,
        status: execution.status,
      } satisfies JobExecution;
    });
  }

  static async getParameters(api: API, id: string): Promise<JobParameter[]> {
    return api.execute<JobParameter[]>(`/jobs/${id}/parameters`);
  }

  async drop() {
    return Job.drop(this._api, this.id);
  }

  async getExecutions(start: number, end: number) {
    return Job.getExecutions(this._api, this.id, start, end);
  }

  async getParameters() {
    return Job.getParameters(this._api, this.id);
  }
}
