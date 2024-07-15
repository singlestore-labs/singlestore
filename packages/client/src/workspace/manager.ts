import { Workspace } from ".";
import { WorkspaceConnection } from "./connection/types";
import { WorkspaceConnectionFactory } from "./connection/factory";
import { WorkspaceDatabaseFactory } from "./database/factory";
import { WorkspaceType } from "./types";

export class WorkspaceManager {
  async connect<T extends WorkspaceType>(type: T, config: WorkspaceConnection<T>["config"]) {
    const connection = WorkspaceConnectionFactory.create(type, config);
    await connection.connect();
    const database = WorkspaceDatabaseFactory.create(connection);

    return new Workspace<T>(connection, database);
  }
}
