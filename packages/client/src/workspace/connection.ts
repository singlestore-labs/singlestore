import { createPool, type Pool, type PoolOptions } from "mysql2/promise";

export interface WorkspaceConnectionConfig extends Partial<Omit<PoolOptions, "database">> {}

export class WorkspaceConnection {
  client: Pool;

  constructor(public config: WorkspaceConnectionConfig) {
    this.client = createPool({ multipleStatements: true, ...this.config });
  }

  static create(config: WorkspaceConnectionConfig) {
    return new WorkspaceConnection(config);
  }

  async disconnect() {
    await this.client.end();
  }
}
