import type { AI, AIBase } from "@singlestore/ai";

import { Connection, type ConnectionConfig } from "./connection";
import { Database, type DatabaseSchema, type DatabaseType } from "./database";

export interface WorkspaceType {
  databases: Record<string, DatabaseType>;
}

export interface WorkspaceSchema<T extends WorkspaceType = WorkspaceType> {
  name: string;
  databases: { [K in keyof T["databases"]]: Omit<DatabaseSchema<T["databases"][K]>, "name"> };
}

export interface ConnectWorkspaceConfig<T extends WorkspaceType = WorkspaceType, U extends AIBase = AI>
  extends ConnectionConfig {
  name?: WorkspaceSchema<T>["name"];
  ai?: U;
}

type DatabaseName<T extends WorkspaceType = WorkspaceType> = Extract<keyof T["databases"], string>;

export class Workspace<T extends WorkspaceType = WorkspaceType, U extends AIBase = AI> {
  constructor(
    public connection: Connection,
    public name?: string,
    private _ai?: U,
  ) {}

  static connect<T extends WorkspaceType = WorkspaceType, U extends AIBase = AI>({
    ai,
    name,
    ...config
  }: ConnectWorkspaceConfig<T, U>) {
    const connection = new Connection(config);
    return new Workspace<T, U>(connection, name, ai);
  }

  database<N, K extends DatabaseName<T> | (string & {}) = DatabaseName<T> | (string & {})>(name: K) {
    type _DatabaseType = N extends DatabaseType ? N : T["databases"][K] extends DatabaseType ? T["databases"][K] : DatabaseType;
    return new Database<_DatabaseType, U>(this.connection, name, this.name, this._ai);
  }

  createDatabase<T extends DatabaseType = DatabaseType>(schema: DatabaseSchema<T>) {
    return Database.create<T, U>(this.connection, schema, this.name, this._ai);
  }

  dropDatabase(name: DatabaseName<T> | (string & {})) {
    return Database.drop(this.connection, name);
  }

  async showDatabasesInfo<U extends boolean>(extended?: U) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this.connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => Database.normalizeInfo<DatabaseName<T>, U>(row, extended));
  }
}
