import type { AnyAI } from "@singlestore/ai";
import type { FieldPacket, ResultSetHeader } from "mysql2/promise";

import { Connection } from "./connection";
import { Table, type TableSchema, type TableType } from "./table";

/**
 * Interface representing the structure of a database type, which includes a record of tables.
 *
 * @property {Record<string, TableType>} tables - A record where the keys are table names and the values are their respective table types.
 */
export interface DatabaseType {
  tables: Record<string, TableType>;
}

/**
 * Interface representing the schema of a database, including its name and optional table schemas.
 *
 * @typeParam TType - A type extending `DatabaseType` that defines the structure of the database.
 *
 * @property {string} name - The name of the database.
 * @property {Object} [tables] - An optional object where each key is a table name and each value is the schema of that table, excluding the name.
 */
export interface DatabaseSchema<TType extends DatabaseType> {
  name: string;
  tables?: { [K in keyof TType["tables"]]: Omit<TableSchema<TType["tables"][K]>, "name"> };
}

/**
 * Interface representing basic information about a database.
 *
 * @typeParam T - A string literal representing the database name.
 *
 * @property {T} name - The name of the database.
 */
export interface DatabaseInfo<T extends string = string> {
  name: T;
}

/**
 * Interface extending `DatabaseInfo` to include additional details about the database's state and performance.
 *
 * @typeParam T - A string literal representing the database name.
 *
 * @property {number} commits - The number of commits made in the database.
 * @property {string} role - The role of the database in the cluster.
 * @property {string} state - The current state of the database.
 * @property {string} position - The current replication position of the database.
 * @property {string} details - Additional details about the database.
 * @property {number} asyncSlaves - The number of asynchronous slaves connected to the database.
 * @property {string} syncSlaves - The identifier of the synchronous slave.
 * @property {number} consensusSlaves - The number of consensus slaves in the cluster.
 * @property {string} committedPosition - The position of the last committed transaction.
 * @property {string} hardenedPosition - The position of the last hardened transaction.
 * @property {string} replayPosition - The position of the last replayed transaction.
 * @property {number} term - The current term in the database's consensus protocol.
 * @property {number} lastPageTerm - The term of the last page in the database.
 * @property {number} memoryMBs - The amount of memory used by the database in megabytes.
 * @property {number} pendingIOs - The number of pending I/O operations.
 * @property {number} pendingBlobFSyncs - The number of pending blob fsync operations.
 */
export interface DatabaseInfoExtended<T extends string> extends DatabaseInfo<T> {
  commits: number;
  role: string;
  state: string;
  position: string;
  details: string;
  asyncSlaves: number;
  syncSlaves: string;
  consensusSlaves: number;
  committedPosition: string;
  hardenedPosition: string;
  replayPosition: string;
  term: number;
  lastPageTerm: number;
  memoryMBs: number;
  pendingIOs: number;
  pendingBlobFSyncs: number;
}

/**
 * Type representing a mapping of database tables to their respective records.
 *
 * @typeParam TTables - A record of tables where each key is the table name and each value is the table type.
 */
export type DatabaseTablesToRecords<TTables extends DatabaseType["tables"]> = { [K in keyof TTables]: TTables[K]["columns"][] };

/**
 * Type representing any database instance, with its associated `Embeddings` and `AI` functionalities.
 */
export type AnyDatabase = Database<any, AnyAI | undefined>;

/**
 * Type representing the name of a table within a specific database type.
 *
 * @typeParam TType - The type of the database.
 */
export type DatabaseTableName<TType extends DatabaseType> = Extract<keyof TType["tables"], string>;

export type InferDatabaseType<T> = T extends Database<infer U, any> ? U : never;

/**
 * Class representing a database and providing methods to manage its tables and query data.
 *
 * @typeParam TDatabaseType - The type of the database, which extends `DatabaseType`.
 * @typeParam TAi - The type of AI functionalities integrated with the database, which can be undefined.
 *
 * @property {Connection} _connection - The connection to the database.
 * @property {string} name - The name of the database.
 * @property {string} [workspaceName] - The name of the workspace the database is associated with.
 * @property {TAi} [ai] - Optional AI functionalities associated with the database.
 */
export class Database<TDatabaseType extends DatabaseType = DatabaseType, TAi extends AnyAI | undefined = undefined> {
  constructor(
    private _connection: Connection,
    public name: string,
    public workspaceName?: string,
    private _ai?: TAi,
  ) {}

  /**
   * Normalizes raw database information into a structured object.
   *
   * @typeParam TName - A string literal representing the database name.
   * @typeParam TExtended - A boolean indicating whether extended information is requested.
   *
   * @param {any} info - The raw database information to normalize.
   * @param {TExtended} [extended] - Whether to include extended information.
   *
   * @returns {TExtended extends true ? DatabaseInfoExtended<TName> : DatabaseInfo<TName>} A structured object containing normalized database information.
   */
  static normalizeInfo<TName extends string = string, TExtended extends boolean = false>(
    info: any,
    extended?: TExtended,
  ): TExtended extends true ? DatabaseInfoExtended<TName> : DatabaseInfo<TName> {
    const name = info[Object.keys(info).find((key) => key.startsWith("Database")) as string];
    if (!extended) return { name } as TExtended extends true ? DatabaseInfoExtended<TName> : DatabaseInfo<TName>;

    return {
      name,
      commits: info.Commits,
      role: info.Role,
      state: info.State,
      position: info.Position,
      details: info.Details,
      asyncSlaves: info.AsyncSlaves,
      syncSlaves: info.SyncSlaves,
      consensusSlaves: info.ConsensusSlaves,
      committedPosition: info.CommittedPosition,
      hardenedPosition: info.HardenedPosition,
      replayPosition: info.ReplayPosition,
      term: info.Term,
      lastPageTerm: info.LastPageTerm,
      memoryMBs: info["Memory (MBs)"],
      pendingIOs: info["Pending IOs"],
      pendingBlobFSyncs: info["Pending blob fsyncs"],
    } as TExtended extends true ? DatabaseInfoExtended<TName> : DatabaseInfo<TName>;
  }

  /**
   * Creates a new database with the specified schema and initializes its tables.
   *
   * @typeParam TType - The type of the database to create.
   * @typeParam TAi - The type of AI functionalities associated with the database, which can be undefined.
   *
   * @param {Connection} connection - The connection to the database.
   * @param {DatabaseSchema<TType>} schema - The schema defining the structure of the database.
   * @param {string} [workspaceName] - The name of the workspace the database is associated with.
   * @param {TAi} [ai] - Optional AI functionalities to associate with the database.
   *
   * @returns {Promise<Database<TType, TAi>>} A promise that resolves to the created `Database` instance.
   */
  static async create<TType extends DatabaseType = DatabaseType, TAi extends AnyAI | undefined = undefined>(
    connection: Connection,
    schema: DatabaseSchema<TType>,
    workspaceName?: string,
    ai?: TAi,
  ): Promise<Database<TType, TAi>> {
    const clauses: string[] = [`CREATE DATABASE IF NOT EXISTS ${schema.name}`];
    if (workspaceName) clauses.push(`ON WORKSPACE \`${workspaceName}\``);
    await connection.client.execute<ResultSetHeader>(clauses.join(" "));

    if (schema.tables) {
      await Promise.all(
        Object.entries(schema.tables).map(([name, tableSchema]) => {
          return Table.create(connection, schema.name, { ...tableSchema, name });
        }),
      );
    }

    return new Database<TType, TAi>(connection, schema.name, workspaceName, ai);
  }

  /**
   * Drops an existing database by name.
   *
   * @param {Connection} connection - The connection to the database.
   * @param {string} name - The name of the database to drop.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the database is dropped.
   */
  static drop(connection: Connection, name: string): Promise<[ResultSetHeader, FieldPacket[]]> {
    return connection.client.execute<ResultSetHeader>(`DROP DATABASE IF EXISTS ${name}`);
  }

  /**
   * Retrieves information about the database, optionally including extended details.
   *
   * @typeParam TExtended - A boolean indicating whether extended information is requested.
   *
   * @param {TExtended} [extended] - Whether to include extended information.
   *
   * @returns {Promise<TExtended extends true ? DatabaseInfoExtended<string> : DatabaseInfo<string>>} A promise that resolves to the database information.
   */
  async showInfo<TExtended extends boolean = false>(
    extended?: TExtended,
  ): Promise<TExtended extends true ? DatabaseInfoExtended<string> : DatabaseInfo<string>> {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return Database.normalizeInfo<string, TExtended>(rows[0], extended);
  }

  /**
   * Describes the database by providing its detailed information along with the structure of its tables.
   *
   * @returns {Promise<any>} A promise that resolves to an object containing the database's details and table structures.
   */
  async describe() {
    const [info, tablesInfo] = await Promise.all([this.showInfo(true), this.showTablesInfo(true)]);

    return {
      ...info,
      tables: await Promise.all(
        tablesInfo.map(async (table) => ({ ...table, columns: await this.table(table.name).showColumnsInfo() })),
      ),
    };
  }

  /**
   * Drops the current database.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the database is dropped.
   */
  drop(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Database.drop(this._connection, this.name);
  }

  /**
   * Retrieves a `Table` instance representing a specific table in the database.
   *
   * @typeParam TType - The type of the table.
   * @typeParam TName - The name of the table, which can be a string literal or a generic string.
   *
   * @param {TName} name - The name of the table to retrieve.
   *
   * @returns {Table<TType extends TableType ? TType : TDatabaseType["tables"][TName] extends TableType ? TDatabaseType["tables"][TName] : TableType, TDatabaseType, TAi>} A `Table` instance representing the specified table.
   */
  table<
    TType,
    TName extends DatabaseTableName<TDatabaseType> | (string & {}) = DatabaseTableName<TDatabaseType> | (string & {}),
  >(
    name: TName,
  ): Table<
    TType extends TableType
      ? TType
      : TDatabaseType["tables"][TName] extends TableType
        ? TDatabaseType["tables"][TName]
        : TableType,
    TDatabaseType,
    TAi
  > {
    return new Table<
      TType extends TableType
        ? TType
        : TDatabaseType["tables"][TName] extends TableType
          ? TDatabaseType["tables"][TName]
          : TableType,
      TDatabaseType,
      TAi
    >(this._connection, this.name, name, this._ai);
  }

  /**
   * Retrieves information about all tables in the database, optionally including extended details.
   *
   * @typeParam TExtended - A boolean indicating whether extended information is requested.
   *
   * @param {TExtended} [extended] - Whether to include extended information.
   *
   * @returns {Promise<Result<Extract<keyof TDatabaseType["tables"], string>, TExtended>[]>} A promise that resolves to an array of table information objects.
   */
  async showTablesInfo<TExtended extends boolean = false>(extended?: TExtended) {
    const clauses = [`SHOW TABLES IN ${this.name}`];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => Table.normalizeInfo<DatabaseTableName<TDatabaseType>, TExtended>(row, extended));
  }

  /**
   * Creates a new table in the database with the specified schema.
   *
   * @typeParam TType - The type of the table to create.
   *
   * @param {TableSchema<TType>} schema - The schema defining the structure of the table.
   *
   * @returns {Promise<Table<TType, TDatabaseType, TAi>>} A promise that resolves to the created `Table` instance.
   */
  createTable<TType extends TableType = TableType>(schema: TableSchema<TType>): Promise<Table<TType, TDatabaseType, TAi>> {
    return Table.create<TType, TDatabaseType, TAi>(this._connection, this.name, schema, this._ai);
  }

  /**
   * Drops a specific table from the database.
   *
   * @param {DatabaseTableName<TDatabaseType> | (string & {})} name - The name of the table to drop.
   *
   * @returns {Promise<[ResultSetHeader, FieldPacket[]]>} A promise that resolves when the table is dropped.
   */
  dropTable(name: DatabaseTableName<TDatabaseType> | (string & {})): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Table.drop(this._connection, this.name, name);
  }

  /**
   * Executes a query against the database after selecting the current database context.
   *
   * @typeParam T - The expected result type of the query.
   *
   * @param {string} statement - The SQL query statement to execute.
   *
   * @returns {Promise<T[]>} A promise that resolves to the result of the query.
   */
  async query<T extends any[]>(statement: string): Promise<T[]> {
    const statements = [`USE ${this.name}`, statement].join(";\n");
    const [rows] = await this._connection.client.execute<T>(statements);
    return rows.slice(1) as T[];
  }
}
