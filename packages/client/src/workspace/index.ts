import { FlexKeyOf } from "../types/helpers";
import { WorkspaceConnection, WorkspaceConnectionConfig } from "./connection";
import { WorkspaceDatabase, WorkspaceDatabaseSchema } from "./database";

export interface WorkspaceSchema<T extends Record<string, WorkspaceDatabaseSchema> = Record<string, WorkspaceDatabaseSchema>> {
  name: string;
  databases: T;
}

export class Workspace<T extends WorkspaceSchema> {
  constructor(
    public name: T["name"],
    public connection: WorkspaceConnection,
  ) {}

  static async connect<T extends WorkspaceSchema>({
    name,
    ...config
  }: Pick<WorkspaceSchema, "name"> & Omit<WorkspaceConnectionConfig, "name">) {
    const connection = new WorkspaceConnection(config);
    await connection.connect();
    return new Workspace<T>(name, connection);
  }

  database<U extends FlexKeyOf<T["databases"]>>(name: U) {
    return new WorkspaceDatabase<T["databases"][U]>(this.connection, name);
  }

  createDatabase<T extends WorkspaceDatabaseSchema>(schema: T) {
    return WorkspaceDatabase.create<T>(this.connection, schema);
  }

  dropDatabase(name: FlexKeyOf<T["databases"]>) {
    return WorkspaceDatabase.drop(this.connection, name);
  }
}
