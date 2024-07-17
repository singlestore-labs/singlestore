import { WorkspaceConnection, WorkspaceConnectionConfig } from "./connection";

export class Workspace<T extends WorkspaceConnection> {
  constructor(public connection: T) {}

  static async connect(config: WorkspaceConnectionConfig) {
    const connection = new WorkspaceConnection(config);
    await connection.connect();
    return new Workspace(connection);
  }
}
