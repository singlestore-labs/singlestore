import type { AnyAI } from "@singlestore/ai";
import type { FieldPacket, ResultSetHeader } from "mysql2/promise";

import { Connection, type ConnectionConfig } from "./connection";
import { type DatabaseType, Database, type DatabaseSchema, DatabaseInfoExtended, DatabaseInfo } from "./database";

/**
 * Interface representing the structure of a workspace type, which includes a record of databases.
 *
 * @property {Record<string, DatabaseType>} databases - A record where the keys are database names and the values are their respective database types.
 */
export interface WorkspaceType {
  databases: Record<string, DatabaseType>;
}

/**
 * Interface representing the schema of a workspace, including its name and database schemas.
 *
 * @typeParam T - A type extending `WorkspaceType` that defines the structure of the workspace.
 *
 * @property {string} name - The name of the workspace.
 * @property {Object} databases - An object where each key is a database name and each value is the schema of that database, excluding the name.
 */
export interface WorkspaceSchema<T extends WorkspaceType> {
  name: string;
  databases: { [K in keyof T["databases"]]: Omit<DatabaseSchema<T["databases"][K]>, "name"> };
}

/**
 * Configuration object for connecting to a workspace within `Workspace`.
 *
 * Extends `ConnectionConfig` to include optional properties `name` and `ai`.
 *
 * @typeParam T - The type of the workspace to connect to.
 * @typeParam U - The type of AI functionalities integrated with the workspace, which can be undefined.
 *
 * @property {string} [name] - The name of the workspace.
 * @property {U} [ai] - Optional AI functionalities to associate with the workspace.
 */
export interface ConnectWorkspaceConfig<T extends WorkspaceType, U extends AnyAI | undefined> extends ConnectionConfig {
  name?: WorkspaceSchema<T>["name"];
  ai?: U;
}

/**
 * Type representing the name of a database within a specific workspace type.
 *
 * @typeParam T - The type of the workspace.
 */
export type WorkspaceDatabaseName<T extends WorkspaceType> = Extract<keyof T["databases"], string>;

/**
 * Class representing a workspace in SingleStore, providing methods to manage its databases and perform operations.
 *
 * @typeParam T - The type of the workspace, which extends `WorkspaceType`.
 * @typeParam U - The type of AI functionalities integrated with the workspace, which can be undefined.
 *
 * @property {Connection} connection - The connection to the workspace.
 * @property {string} [name] - The name of the workspace.
 * @property {U} [ai] - Optional AI functionalities associated with the workspace.
 */
export class Workspace<T extends WorkspaceType = WorkspaceType, U extends AnyAI | undefined = undefined> {
  constructor(
    public connection: Connection,
    public name?: string,
    private _ai?: U,
  ) {}

  /**
   * Connects to a workspace in SingleStore, establishing a connection and associating AI functionalities if provided.
   *
   * @typeParam T - The type of the workspace to connect to.
   * @typeParam U - The type of AI functionalities associated with the workspace, which can be undefined.
   *
   * @param {ConnectWorkspaceConfig<T, U>} config - The configuration object for connecting to the workspace.
   *
   * @returns {Workspace<T, U>} A `Workspace` instance representing the connected workspace.
   */
  static connect<T extends WorkspaceType = WorkspaceType, U extends AnyAI | undefined = undefined>({
    ai,
    name,
    ...config
  }: ConnectWorkspaceConfig<T, U>): Workspace<T, U> {
    const connection = new Connection(config);
    return new Workspace<T, U>(connection, name, ai);
  }

  /**
   * Retrieves a `Database` instance representing a specific database in the workspace.
   *
   * @typeParam K - The type of the database.
   * @typeParam V - The name of the database, which can be a string literal or a generic string.
   *
   * @param {V} name - The name of the database to retrieve.
   *
   * @returns {Database<K extends DatabaseType ? K : T["databases"][V] extends DatabaseType ? T["databases"][V] : DatabaseType, U>} A `Database` instance representing the specified database.
   */
  database<K, V extends WorkspaceDatabaseName<T> | (string & {}) = WorkspaceDatabaseName<T> | (string & {})>(
    name: V,
  ): Database<K extends DatabaseType ? K : T["databases"][V] extends DatabaseType ? T["databases"][V] : DatabaseType, U> {
    return new Database<
      K extends DatabaseType ? K : T["databases"][V] extends DatabaseType ? T["databases"][V] : DatabaseType,
      U
    >(this.connection, name, this.name, this._ai);
  }

  /**
   * Creates a new database in the workspace with the specified schema.
   *
   * @typeParam K - The type of the database to create.
   *
   * @param {DatabaseSchema<K>} schema - The schema defining the structure of the database.
   *
   * @returns {Promise<Database<K, U>>} A promise that resolves to the created `Database` instance.
   */
  createDatabase<K extends DatabaseType = DatabaseType>(schema: DatabaseSchema<K>): Promise<Database<K, U>> {
    return Database.create<K, U>(this.connection, schema, this.name, this._ai);
  }

  /**
   * Drops a specific database from the workspace.
   *
   * @param {WorkspaceDatabaseName<T> | (string & {})} name - The name of the database to drop.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the database is dropped.
   */
  dropDatabase(name: WorkspaceDatabaseName<T> | (string & {})): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Database.drop(this.connection, name);
  }

  /**
   * Retrieves information about all databases in the workspace, optionally including extended details.
   *
   * @typeParam K - A boolean indicating whether extended information is requested.
   *
   * @param {K} [extended] - Whether to include extended information.
   *
   * @returns {Promise<(K extends true ? DatabaseInfoExtended<WorkspaceDatabaseName<T>> : DatabaseInfo<WorkspaceDatabaseName<T>>)[]>} A promise that resolves to an array of database information objects.
   */
  async showDatabasesInfo<K extends boolean = false>(
    extended?: K,
  ): Promise<(K extends true ? DatabaseInfoExtended<WorkspaceDatabaseName<T>> : DatabaseInfo<WorkspaceDatabaseName<T>>)[]> {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this.connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => Database.normalizeInfo<WorkspaceDatabaseName<T>, K>(row, extended));
  }
}
