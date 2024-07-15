import { createPool } from "mysql2/promise";
import { AbstractWorkspaceConnection } from "./abstract";

export class SQLWorkspaceConnection extends AbstractWorkspaceConnection<"sql"> {
  type = "sql" as const;

  async connect(): Promise<void> {
    this._client = createPool(this.config);
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    this._client = undefined;
  }
}

export function isSQLWorkspaceConnectionConfig(value: any): value is SQLWorkspaceConnection["config"] {
  return typeof value === "object" && value && value.host && value.user && value.password;
}

export function isSQLWorkspaceConnection(value: any): value is SQLWorkspaceConnection {
  return typeof value === "object" && value && "type" in value && value.type === "sql";
}
