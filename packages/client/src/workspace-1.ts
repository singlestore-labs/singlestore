import type { AnyAI } from "@singlestore/ai";
import type { FieldPacket, ResultSetHeader } from "mysql2/promise";

import { Connection, type ConnectionConfig } from "./connection";
import { type DatabaseType, Database, type DatabaseSchema, DatabaseInfoExtended, DatabaseInfo } from "./database-1";

export interface WorkspaceType {
  databases: Record<string, DatabaseType>;
}

export interface WorkspaceSchema<TWorkspaceType extends WorkspaceType> {
  name: string;
  databases: { [K in keyof TWorkspaceType["databases"]]: Omit<DatabaseSchema<TWorkspaceType["databases"][K]>, "name"> };
}

export interface ConnectWorkspaceConfig<TWorkspaceType extends WorkspaceType, TAi extends AnyAI | undefined>
  extends ConnectionConfig {
  name?: WorkspaceSchema<TWorkspaceType>["name"];
  ai?: TAi;
}

export type WorkspaceDatabaseName<TWorkspaceType extends WorkspaceType> = Extract<keyof TWorkspaceType["databases"], string>;

export class WorkspaceConnection<
  TWorkspaceType extends WorkspaceType = WorkspaceType,
  TAi extends AnyAI | undefined = undefined,
> {
  constructor(
    public connection: Connection,
    public name?: string,
    private _ai?: TAi,
  ) {}

  static connect<TWorkspaceType extends WorkspaceType = WorkspaceType, TAi extends AnyAI | undefined = undefined>({
    ai,
    name,
    ...config
  }: ConnectWorkspaceConfig<TWorkspaceType, TAi>): WorkspaceConnection<TWorkspaceType, TAi> {
    const connection = new Connection(config);
    return new WorkspaceConnection(connection, name, ai);
  }

  database<
    TType,
    TName extends WorkspaceDatabaseName<TWorkspaceType> | (string & {}) = WorkspaceDatabaseName<TWorkspaceType> | (string & {}),
  >(
    name: TName,
  ): Database<
    TType extends DatabaseType
      ? TType
      : TWorkspaceType["databases"][TName] extends DatabaseType
        ? TWorkspaceType["databases"][TName]
        : DatabaseType,
    TAi
  > {
    return new Database(this.connection, name, this.name, this._ai);
  }

  createDatabase<TType extends DatabaseType = DatabaseType>(schema: DatabaseSchema<TType>): Promise<Database<TType, TAi>> {
    return Database.create(this.connection, schema, this.name, this._ai);
  }

  dropDatabase(name: WorkspaceDatabaseName<TWorkspaceType> | (string & {})): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Database.drop(this.connection, name);
  }

  async showDatabasesInfo<TExtended extends boolean = false>(
    extended?: TExtended,
  ): Promise<
    (TExtended extends true
      ? DatabaseInfoExtended<WorkspaceDatabaseName<TWorkspaceType>>
      : DatabaseInfo<WorkspaceDatabaseName<TWorkspaceType>>)[]
  > {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this.connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => Database.normalizeInfo<WorkspaceDatabaseName<TWorkspaceType>, TExtended>(row, extended));
  }
}
