import { WorkspaceConnection } from "./connection";

export class WorkspaceManager {
  async connect<T extends WorkspaceConnection["type"]>(type: T, config: WorkspaceConnection<T>["config"]) {
    return WorkspaceConnection.create<T>(type, config);
  }
}
