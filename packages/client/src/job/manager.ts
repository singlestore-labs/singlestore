import type { Optional } from "@repo/utils";

import { APIManager } from "../api/manager";

import { Job, type JobParameter, type JobTargetConfig, type JobRuntime, type JobSchedule, JobSchema } from ".";

export interface CreateJobBody {
  name?: JobSchema["name"];
  description?: JobSchema["description"];
  executionConfig: {
    runtimeName?: string;
    notebookPath: string;
    createSnapshot?: boolean;
  };
  parameters?: JobParameter[];
  schedule: Optional<JobSchedule, "executionIntervalInMinutes" | "startAt">;
  targetConfig?: Optional<JobTargetConfig, "databaseName" | "resumeTarget">;
}

export class JobManager extends APIManager {
  protected _baseUrl: string = "/jobs";

  private _create(data: JobSchema): Job {
    return new Job(
      this._api,
      data.jobID,
      data.name,
      data.description,
      data.enqueuedBy,
      data.executionConfig,
      data.jobMetadata,
      data.targetConfig,
      data.completedExecutionsCount,
      { ...data.schedule, startAt: data.schedule.startAt ? new Date(data.schedule.startAt) : null },
      new Date(data.createdAt),
      data.terminatedAt ? new Date(data.terminatedAt) : null,
    );
  }

  async create(body: CreateJobBody) {
    const response = await this._execute<JobSchema>("", { method: "POST", body: JSON.stringify(body) });
    return this._create(response);
  }

  async get(id: JobSchema["jobID"]) {
    const response = await this._execute<JobSchema>(`/${id}`);
    return this._create(response);
  }

  async delete(id: JobSchema["jobID"]) {
    return Job.delete(this._api, id);
  }

  async getExecutions(id: JobSchema["jobID"], ...args: Parameters<Job["getExecutions"]>) {
    return Job.getExecutions(this._api, id, ...args);
  }

  async getParameters(id: JobSchema["jobID"]) {
    return Job.getParameters(this._api, id);
  }

  async getRuntimes() {
    return this._execute<JobRuntime[]>("/runtimes");
  }
}
