import { APIManager } from "../api/manager";

import { Job, type JobRuntime } from ".";

export class JobManager extends APIManager {
  protected _baseUrl: string = "/jobs";

  async getRuntimes(): Promise<JobRuntime[]> {
    const response = await this._execute<any[]>("/runtimes");
    return response.map((data) => ({
      name: data.name,
      description: data.description,
    }));
  }

  async get(id: string): Promise<Job> {
    const response = await this._execute(`/${id}`);
    return new Job(
      this._api,
      response.jobID,
      response.name,
      response.description,
      response.enqueuedBy,
      response.executionConfig,
      response.jobMetadata,
      response.targetConfig,
      response.completedExecutionsCount,
      response.schedule,
      new Date(response.createdAt),
      new Date(response.terminatedAt),
    );
  }
}
