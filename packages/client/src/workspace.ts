import type { AI } from "@singlestore/ai";

import { Connection, type ConnectionConfig } from "./connection";
import { Database, type DatabaseSchema, type DatabaseType } from "./database";

export interface WorkspaceType {
  databases: Record<string, DatabaseType>;
}

export interface WorkspaceSchema<T extends WorkspaceType> {
  name: string;
  databases: { [K in keyof T["databases"]]: Omit<DatabaseSchema<T["databases"][K]>, "name"> };
}

export interface ConnectWorkspaceConfig<T extends WorkspaceType, U extends AI> extends ConnectionConfig {
  name?: WorkspaceSchema<T>["name"];
  ai?: U;
}

export type ExtractDatabaseName<T extends WorkspaceType> = Extract<keyof T["databases"], string>;

export type DatabaseName<T extends WorkspaceType> = ExtractDatabaseName<T> | (string & {});

export class Workspace<T extends WorkspaceType = any, U extends AI = AI> {
  constructor(
    public connection: Connection,
    public name?: string,
    private _ai?: U,
  ) {}

  static connect<T extends WorkspaceType = any, U extends AI = AI>({ ai, name, ...config }: ConnectWorkspaceConfig<T, U>) {
    const connection = new Connection(config);
    return new Workspace<T, U>(connection, name, ai);
  }

  database<N, K extends DatabaseName<T> = DatabaseName<T>>(name: K) {
    return new Database<N extends DatabaseType ? N : T["databases"][K], U>(this.connection, name, this.name, this._ai);
  }

  createDatabase<T extends DatabaseType>(schema: DatabaseSchema<T>) {
    return Database.create<T, U>(this.connection, schema, this.name, this._ai);
  }

  dropDatabase(name: DatabaseName<T>) {
    return Database.drop(this.connection, name);
  }

  async showDatabasesInfo<U extends boolean>(extended?: U) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this.connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => Database.normalizeInfo<ExtractDatabaseName<T>, U>(row, extended));
  }
}
