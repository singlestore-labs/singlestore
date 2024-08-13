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

export class Workspace<T extends WorkspaceType = any, U extends AI = AI> {
  constructor(
    public connection: WorkspaceConnection,
    public name?: string,
    private _ai?: U,
  ) {}

  static connect<T extends WorkspaceType = any, U extends AI = AI>({
    ai,
    name,
    ...config
  }: Partial<Pick<WorkspaceSchema<T>, "name">> & Omit<WorkspaceConnectionConfig, "name"> & { ai?: U }) {
    const connection = new WorkspaceConnection(config);
    return new Workspace<T, U>(connection, name, ai);
  }

  database<
    N,
    K extends Extract<keyof T["databases"], string> | (string & {}) = Extract<keyof T["databases"], string> | (string & {}),
  >(name: K) {
    return new WorkspaceDatabase<N extends WorkspaceDatabaseType ? N : T["databases"][K], U>(
      this.connection,
      name as string,
      this.name,
      this._ai,
    );
  }

  createDatabase<T extends WorkspaceDatabaseType>(schema: WorkspaceDatabaseSchema<T>) {
    return WorkspaceDatabase.create<T, U>(this.connection, schema, this.name, this._ai);
  }

  dropDatabase(name: Extract<keyof T["databases"], string> | ({} & string)) {
    return WorkspaceDatabase.drop(this.connection, name);
  }

  async showDatabasesInfo<U extends boolean>(extended?: U) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this.connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => WorkspaceDatabase.normalizeInfo<Extract<keyof T["databases"], string>, U>(row, extended));
  }
}
