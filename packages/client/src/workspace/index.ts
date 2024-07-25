import { WorkspaceConnection, WorkspaceConnectionConfig } from "./connection";
import { WorkspaceDatabase, WorkspaceDatabaseSchema, WorkspaceDatabaseType } from "./database";

export interface WorkspaceType {
  databases: Record<string, WorkspaceDatabaseType>;
}

export interface WorkspaceSchema<T extends WorkspaceType> {
  name: string;
  databases: { [K in keyof T["databases"]]: Omit<WorkspaceDatabaseSchema<T["databases"][K]>, "name"> };
}

export class Workspace<T extends WorkspaceType> {
  constructor(
    public connection: WorkspaceConnection,
    public name: string,
  ) {}

  static async connect<T extends WorkspaceType>({
    name,
    ...config
  }: Pick<WorkspaceSchema<T>, "name"> & Omit<WorkspaceConnectionConfig, "name">) {
    const connection = new WorkspaceConnection(config);
    await connection.connect();
    return new Workspace<T>(connection, name);
  }

  database<U extends Extract<keyof T["databases"], string>>(name: U) {
    return new WorkspaceDatabase<T["databases"][U]>(this.connection, this.name, name);
  }

  createDatabase<T extends WorkspaceDatabaseType>(schema: WorkspaceDatabaseSchema<T>) {
    return WorkspaceDatabase.create<T>(this.connection, this.name, schema);
  }

  dropDatabase(name: Extract<keyof T["databases"], string>) {
    return WorkspaceDatabase.drop(this.connection, name);
  }
}
