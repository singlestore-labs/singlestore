import { WorkspaceConnection } from "./connection/types";
import { WorkspaceDatabase } from "./database/types";
import { WorkspaceType } from "./types";

export class Workspace<T extends WorkspaceType = any> {
  constructor(
    private connection: WorkspaceConnection<T>,
    public database: WorkspaceDatabase<T>,
  ) {}

  get client(): WorkspaceConnection<T>["client"] {
    return this.connection.client;
  }
}
