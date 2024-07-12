import { createPool, type Pool, type PoolOptions } from "mysql2/promise";
import { WorkspaceConnectionClient } from "./abstract";

export class SQLWorkspaceConnectionClient extends WorkspaceConnectionClient {
  type = "sql" as const;
  protected _connection: Pool | undefined;

  constructor(
    public config: { host: string; user: string; password: string } & Partial<
      Omit<PoolOptions, "host" | "user" | "password" | "database">
    >,
  ) {
    super(config);
  }

  get connection() {
    if (!this._connection) throw new Error("Not connected");
    return this._connection;
  }

  async connect(): Promise<void> {
    this._connection = createPool(this.config);
  }

  async disconnect(): Promise<void> {
    await this.connection.end();
    this._connection = undefined;
  }
}

export function isSQLWorkspaceClientConfig(config: any): config is SQLWorkspaceConnectionClient["config"] {
  return typeof config === "object" && config && config.host && config.user && config.password;
}
