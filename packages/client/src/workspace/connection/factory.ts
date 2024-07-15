import { WorkspaceType } from "../types";
import { isKaiWorkspaceConnectionConfig, KaiWorkspaceConnection } from "./kai";
import { isSQLWorkspaceConnectionConfig, SQLWorkspaceConnection } from "./sql";
import { WorkspaceConnection } from "./types";

export class WorkspaceConnectionFactory {
  static create<T extends WorkspaceType>(type: T, config: WorkspaceConnection<T>["config"]): WorkspaceConnection<T> {
    if (type === "sql") {
      if (!isSQLWorkspaceConnectionConfig(config)) {
        throw new Error("Invalid config");
      }
      return new SQLWorkspaceConnection(config) as WorkspaceConnection<T>;
    } else if (type === "kai") {
      if (!isKaiWorkspaceConnectionConfig(config)) {
        throw new Error("Invalid config");
      }
      return new KaiWorkspaceConnection(config) as WorkspaceConnection<T>;
    } else {
      throw new Error("Unsupported connection type");
    }
  }
}
