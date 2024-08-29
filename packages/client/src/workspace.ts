import type { AnyAI } from "@singlestore/ai";
import type { FieldPacket, ResultSetHeader } from "mysql2/promise";

import { Connection, type ConnectionConfig } from "./connection";
import { type DatabaseType, Database, type DatabaseSchema, DatabaseInfoExtended, DatabaseInfo } from "./database";

/**
 * Interface representing the structure of a workspace type, which includes a record of databases.
 *
 * @interface WorkspaceType
 * @property {Record<string, DatabaseType>} databases - A record where the keys are database names and the values are their respective database types.
 */
export interface WorkspaceType {
  databases: Record<string, DatabaseType>;
}

/**
 * Interface representing the schema of a workspace, including its name and database schemas.
 *
 * @interface WorkspaceSchema
 * @typeParam TWorkspaceType - A type extending `WorkspaceType` that defines the structure of the workspace.
 * @property {string} name - The name of the workspace.
 * @property {Object} databases - An object where each key is a database name and each value is the schema of that database, excluding the name.
 */
export interface WorkspaceSchema<TWorkspaceType extends WorkspaceType> {
  name: string;
  databases: { [K in keyof TWorkspaceType["databases"]]: Omit<DatabaseSchema<TWorkspaceType["databases"][K]>, "name"> };
}

/**
 * Configuration object for connecting to a workspace within `Workspace`.
 *
 * Extends `ConnectionConfig` to include optional properties `name` and `ai`.
 *
 * @interface ConnectWorkspaceConfig
 * @typeParam TWorkspaceType - The type of the workspace to connect to.
 * @typeParam TAi - The type of AI functionalities integrated with the workspace, which can be undefined.
 * @property {string} [name] - The name of the workspace.
 * @property {TAi} [ai] - Optional AI functionalities to associate with the workspace.
 */
export interface ConnectWorkspaceConfig<TWorkspaceType extends WorkspaceType, TAi extends AnyAI | undefined>
  extends ConnectionConfig {
  name?: WorkspaceSchema<TWorkspaceType>["name"];
  ai?: TAi;
}

/**
 * Type representing the name of a database within a specific workspace type.
 *
 * @type WorkspaceDatabaseName
 * @typeParam TWorkspaceType - The type of the workspace.
 */
export type WorkspaceDatabaseName<TWorkspaceType extends WorkspaceType> = Extract<keyof TWorkspaceType["databases"], string>;

/**
 * Class representing a workspace in SingleStore, providing methods to manage its databases and perform operations.
 *
 * @class Workspace
 * @typeParam TWorkspaceType - The type of the workspace, which extends `WorkspaceType`.
 * @typeParam TAi - The type of AI functionalities integrated with the workspace, which can be undefined.
 */
export class Workspace<TWorkspaceType extends WorkspaceType = WorkspaceType, TAi extends AnyAI | undefined = undefined> {
  constructor(
    public connection: Connection,
    public name?: string,
    private _ai?: TAi,
  ) {}

  /**
   * Connects to a workspace in SingleStore, establishing a connection and associating AI functionalities if provided.
   *
   * @static
   * @typeParam TWorkspaceType - The type of the workspace to connect to.
   * @typeParam TAi - The type of AI functionalities associated with the workspace, which can be undefined.
   * @param {ConnectWorkspaceConfig<TWorkspaceType, TAi>} config - The configuration object for connecting to the workspace.
   * @returns {Workspace<TWorkspaceType, TAi>} A `Workspace` instance representing the connected workspace.
   */
  static connect<TWorkspaceType extends WorkspaceType = WorkspaceType, TAi extends AnyAI | undefined = undefined>({
    ai,
    name,
    ...config
  }: ConnectWorkspaceConfig<TWorkspaceType, TAi>): Workspace<TWorkspaceType, TAi> {
    const connection = new Connection(config);
    return new Workspace(connection, name, ai);
  }

  /**
   * Retrieves a `Database` instance representing a specific database in the workspace.
   *
   * @typeParam TType - The type of the database.
   * @typeParam TName - The name of the database, which can be a string literal or a generic string.
   * @param {TName} name - The name of the database to retrieve.
   * @returns {Database<TType extends DatabaseType ? TType : TWorkspaceType["databases"][TName] extends DatabaseType ? TWorkspaceType["databases"][TName] : DatabaseType, TAi>} A `Database` instance representing the specified database.
   */
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

  /**
   * Creates a new database in the workspace with the specified schema.
   *
   * @typeParam TType - The type of the database to create.
   * @param {DatabaseSchema<TType>} schema - The schema defining the structure of the database.
   * @returns {Promise<Database<TType, TAi>>} A promise that resolves to the created `Database` instance.
   */
  createDatabase<TType extends DatabaseType = DatabaseType>(schema: DatabaseSchema<TType>): Promise<Database<TType, TAi>> {
    return Database.create(this.connection, schema, this.name, this._ai);
  }

  /**
   * Drops a specific database from the workspace.
   *
   * @param {WorkspaceDatabaseName<TWorkspaceType> | (string & {})} name - The name of the database to drop.
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the database is dropped.
   */
  dropDatabase(name: WorkspaceDatabaseName<TWorkspaceType> | (string & {})): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Database.drop(this.connection, name);
  }

  /**
   * Retrieves information about all databases in the workspace, optionally including extended details.
   *
   * @typeParam TExtended - A boolean indicating whether extended information is requested.
   * @param {TExtended} [extended] - Whether to include extended information.
   * @returns {Promise<(TExtended extends true ? DatabaseInfoExtended<WorkspaceDatabaseName<TWorkspaceType>> : DatabaseInfo<WorkspaceDatabaseName<TWorkspaceType>>)[]>} A promise that resolves to an array of database information objects.
   */
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
