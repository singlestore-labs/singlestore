import type { AI } from "@singlestore/ai";
import { WorkspaceConnection, type WorkspaceConnectionConfig } from "./connection";
import { WorkspaceDatabase, type WorkspaceDatabaseSchema, type WorkspaceDatabaseType } from "./database";

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
    private _ai?: AI,
  ) {}

  static connect<T extends WorkspaceType>({
    ai,
    name,
    ...config
  }: Pick<WorkspaceSchema<T>, "name"> & Omit<WorkspaceConnectionConfig, "name"> & { ai?: AI }) {
    const connection = new WorkspaceConnection(config);
    return new Workspace<T>(connection, name, ai);
  }

  database<U, K extends keyof T["databases"] | (string & {}) = keyof T["databases"] | (string & {})>(name: K) {
    return new WorkspaceDatabase<U extends WorkspaceDatabaseType ? U : T["databases"][K]>(
      this.connection,
      this.name,
      name as string,
      this._ai,
    );
  }

  createDatabase<T extends WorkspaceDatabaseType>(schema: WorkspaceDatabaseSchema<T>) {
    return WorkspaceDatabase.create<T>(this.connection, this.name, schema, this._ai);
  }

  dropDatabase(name: ({} & string) | Extract<keyof T["databases"], string>) {
    return WorkspaceDatabase.drop(this.connection, name);
  }
}
