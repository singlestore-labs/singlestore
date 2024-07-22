import { FlexKeyOf } from "../types/helpers";
import { WorkspaceConnection, WorkspaceConnectionConfig } from "./connection";
import { WorkspaceDatabase, WorkspaceDatabaseSchema, WorkspaceDatabaseType } from "./database";

export interface WorkspaceType {
  name?: string;
  databases: Record<string, WorkspaceDatabaseType>;
}

export interface WorkspaceSchema<T extends WorkspaceType = WorkspaceType> {
  name: Exclude<T["name"], undefined>;
  databases: { [K in keyof T["databases"]]: Omit<WorkspaceDatabaseSchema<T["databases"][K]>, "name"> };
}

export class Workspace<T extends WorkspaceType = WorkspaceType> {
  constructor(
    public name: WorkspaceSchema["name"],
    public connection: WorkspaceConnection,
  ) {}

  static async connect<T extends WorkspaceType>({
    name,
    ...config
  }: Pick<WorkspaceSchema<T>, "name"> & Omit<WorkspaceConnectionConfig, "name">) {
    const connection = new WorkspaceConnection(config);
    await connection.connect();
    return new Workspace<T>(name, connection);
  }

  database<U extends FlexKeyOf<T["databases"]>>(name: U) {
    return new WorkspaceDatabase<T["databases"][U]>(this.connection, name);
  }

  createDatabase<T extends WorkspaceDatabaseType>(schema: WorkspaceDatabaseSchema<T>) {
    return WorkspaceDatabase.create<T>(this.connection, schema);
  }

  dropDatabase(name: FlexKeyOf<T["databases"]>) {
    return WorkspaceDatabase.drop(this.connection, name);
  }
}
