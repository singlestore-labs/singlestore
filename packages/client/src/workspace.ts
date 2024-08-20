import type { AnyAI } from "@singlestore/ai";

import { Connection, type ConnectionConfig } from "./connection";
import { type DatabaseType, Database, type DatabaseSchema } from "./database";

export interface WorkspaceType {
  databases: Record<string, DatabaseType>;
}

export interface WorkspaceSchema<T extends WorkspaceType> {
  name: string;
  databases: { [K in keyof T["databases"]]: Omit<DatabaseSchema<T["databases"][K]>, "name"> };
}

export interface ConnectWorkspaceConfig<T extends WorkspaceType, U extends AnyAI | undefined> extends ConnectionConfig {
  name?: WorkspaceSchema<T>["name"];
  ai?: U;
}

export type WorkspaceDatabaseName<T extends WorkspaceType> = Extract<keyof T["databases"], string>;

export class Workspace<T extends WorkspaceType = WorkspaceType, U extends AnyAI | undefined = undefined> {
  constructor(
    public connection: Connection,
    public name?: string,
    private _ai?: U,
  ) {}

  static connect<T extends WorkspaceType = WorkspaceType, U extends AnyAI | undefined = undefined>({
    ai,
    name,
    ...config
  }: ConnectWorkspaceConfig<T, U>) {
    const connection = new Connection(config);
    return new Workspace<T, U>(connection, name, ai);
  }

  database<K, V extends WorkspaceDatabaseName<T> | (string & {}) = WorkspaceDatabaseName<T> | (string & {})>(name: V) {
    type _DatabaseType = K extends DatabaseType ? K : T["databases"][V] extends DatabaseType ? T["databases"][V] : DatabaseType;
    return new Database<_DatabaseType, U>(this.connection, name, this.name, this._ai);
  }

  createDatabase<K extends DatabaseType = DatabaseType>(schema: DatabaseSchema<K>) {
    return Database.create<K, U>(this.connection, schema, this.name, this._ai);
  }

  dropDatabase(name: WorkspaceDatabaseName<T> | (string & {})) {
    return Database.drop(this.connection, name);
  }

  async showDatabasesInfo<K extends boolean>(extended?: K) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this.connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => Database.normalizeInfo<WorkspaceDatabaseName<T>, K>(row, extended));
  }
}
