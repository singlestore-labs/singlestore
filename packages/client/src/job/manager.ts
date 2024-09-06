import type { Optional } from "@repo/utils";

import { APIManager } from "../api/manager";

import { Job, type JobParameter, type JobTargetConfig, type JobRuntime, type JobSchedule } from ".";

export interface CreateJobBody {
  name?: Job["name"];
  description?: Job["description"];
  executionConfig: {
    createSnapshot?: boolean;
    notebookPath: string;
    runtimeName?: string;
  };
  parameters?: JobParameter[];
  schedule: Optional<JobSchedule, "executionIntervalInMinutes" | "startAt">;
  targetConfig?: Optional<JobTargetConfig, "databaseName" | "resumeTarget">;
}

export class JobManager extends APIManager {
  protected _baseUrl: string = "/jobs";

  private _create(data: any): Job {
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
      { ...data.schedule, startAt: new Date(data.schedule.startAt) },
      new Date(data.createdAt),
      new Date(data.terminatedAt),
    );
  }

  async create<TBody extends CreateJobBody>(body: TBody) {
    const response = await this._execute("", { method: "POST", body: JSON.stringify(body) });
    return this._create(response);
  }

  async get(id: string) {
    const response = await this._execute(`/${id}`);
    return this._create(response);
  }

  async drop(id: string) {
    return Job.drop(this._api, id);
  }

  async getExecutions(id: string, ...args: Parameters<Job["getExecutions"]>) {
    return Job.getExecutions(this._api, id, ...args);
  }

  async getParameters(id: string) {
    return Job.getParameters(this._api, id);
  }

  async getRuntimes(): Promise<JobRuntime[]> {
    const response = await this._execute<{ name: JobRuntime["name"]; description: string }[]>("/runtimes");
    return response.map((data) => ({
      name: data.name,
      description: data.description,
    }));
  }
}
