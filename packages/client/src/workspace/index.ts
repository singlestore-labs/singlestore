import { WorkspaceConnection, WorkspaceConnectionConfig } from "./connection";
import { WorkspaceDatabase, WorkspaceDatabaseSchema } from "./database";

export class Workspace<T extends WorkspaceConnection> {
  constructor(public connection: T) {}

  static async connect(config: WorkspaceConnectionConfig) {
    const connection = new WorkspaceConnection(config);
    await connection.connect();
    return new Workspace(connection);
  }

  database<T extends WorkspaceDatabaseSchema["name"]>(name: T) {
    return new WorkspaceDatabase(this.connection, name);
  }

  createDatabase<T extends WorkspaceDatabaseSchema>(schema: T) {
    return WorkspaceDatabase.create(this.connection, schema);
  }

  dropDatabase(name: WorkspaceDatabaseSchema["name"]) {
    return WorkspaceDatabase.drop(this.connection, name);
  }
}
