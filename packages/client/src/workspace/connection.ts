import { createPool, type Pool, type PoolOptions } from "mysql2/promise";

export interface WorkspaceConnectionConfig extends Partial<Omit<PoolOptions, "host" | "user" | "password" | "database">> {
  host: string;
  user: string;
  password: string;
}

export class WorkspaceConnection {
  private _client: Pool | undefined;

  constructor(public config: WorkspaceConnectionConfig) {}

  get client() {
    if (!this._client) {
      throw new Error("Not connected");
    }
    return this._client;
  }

  async connect() {
    this._client = createPool({ multipleStatements: true, ...this.config });
  }

  async disconnect() {
    await this.client.end();
    this._client = undefined;
  }
}
