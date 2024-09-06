import type { API } from "../api";

import { APIManager } from "../api/manager";

export type JobRuntimeName = "notebooks-cpu-small" | "notebooks-cpu-medium" | "notebooks-gpu-t4";

export interface JobRuntime {
  name: JobRuntimeName;
  description: string;
}

export type JobExecutionStatus = "Scheduled" | "Running" | "Completed" | "Failed";

export interface JobExecution {
  id: string;
  number: number;
  jobId: string;
  scheduledStartTime: Date;
  startedAt: Date;
  finishedAt: Date;
  snapshotNotebookPath: string;
  status: JobExecutionStatus;
}

export interface JobExecutionConfig {
  createSnapshot: boolean;
  maxAllowedExecutionDurationInMinutes: number;
  notebookPath: string;
}

export interface JobMetadata {
  avgDurationInSeconds: number;
  count: number;
  maxDurationInSeconds: number;
  status: "Completed" | "Failed" | "Error";
}

export interface JobSchedule {
  executionIntervalInMinutes: number;
  mode: "Recurring" | "One-Time";
  startAt: string | null;
}

export interface JobTargetConfig {
  databaseName: string;
  resumeTarget: boolean;
  targetID: string;
  targetType: string;
}

export interface JobParameter {
  name: string;
  type: string;
  value: any;
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

  async getExecutions(start: number, end: number): Promise<JobExecution[]> {
    const params = new URLSearchParams({ start: start.toString(), end: end.toString() });
    const response = await this._execute(`/executions?${params.toString()}`);
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

  async getParameters(): Promise<JobParameter[]> {
    return this._execute<JobParameter[]>("/parameters");
  }
}
