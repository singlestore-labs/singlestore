import { WorkspaceDatabase } from "./types";
import { WorkspaceConnection } from "../connection/types";
import { isKaiWorkspaceConnection } from "../connection/kai";
import { isSQLWorkspaceConnection } from "../connection/sql";
import { KaiWorkspaceDatabase } from "./kai";
import { SQLWorkspaceDatabase } from "./sql";

export class WorkspaceDatabaseFactory {
  static create<T extends WorkspaceConnection>(connection: T): WorkspaceDatabase<T["type"]> {
    if (connection.type === "sql" && isSQLWorkspaceConnection(connection)) {
      return new SQLWorkspaceDatabase(connection) as WorkspaceDatabase<T["type"]>;
    } else if (connection.type === "kai" && isKaiWorkspaceConnection(connection)) {
      return new KaiWorkspaceDatabase(connection) as WorkspaceDatabase<T["type"]>;
    } else {
      throw new Error("Unsupported connection type");
    }
  }
}
