import type { AnyAI } from "@singlestore/ai";
import type { FieldPacket, ResultSetHeader } from "mysql2/promise";

import { Connection } from "./connection";
import { Table, type TableSchema, type TableType } from "./table-1";

export interface DatabaseType {
  name: string;
  tables: Record<string, TableType>;
}

export interface DatabaseSchema<TType extends DatabaseType> {
  name: TType["name"];
  tables?: { [K in keyof TType["tables"]]: Omit<TableSchema<TType["tables"][K]>, "name"> };
}

export interface DatabaseInfo<T extends string = string> {
  name: T;
}

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

export type DatabaseTablesToRecords<TTables extends DatabaseType["tables"]> = { [K in keyof TTables]: TTables[K]["columns"][] };

export type AnyDatabase = Database<any, AnyAI | undefined>;

export type DatabaseTableName<TType extends DatabaseType> = Extract<keyof TType["tables"], string>;

export type InferDatabaseType<T> = T extends Database<infer U, any> ? U : never;

export class Database<TDatabaseType extends DatabaseType = DatabaseType, TAi extends AnyAI | undefined = undefined> {
  constructor(
    private _connection: Connection,
    public name: TDatabaseType["name"],
    public workspaceName?: string,
    private _ai?: TAi,
  ) {}

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

    return new Database(connection, schema.name, workspaceName, ai);
  }

  static drop(connection: Connection, name: string): Promise<[ResultSetHeader, FieldPacket[]]> {
    return connection.client.execute<ResultSetHeader>(`DROP DATABASE IF EXISTS ${name}`);
  }

  async showInfo<TExtended extends boolean = false>(
    extended?: TExtended,
  ): Promise<TExtended extends true ? DatabaseInfoExtended<TDatabaseType["name"]> : DatabaseInfo<TDatabaseType["name"]>> {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return Database.normalizeInfo<TDatabaseType["name"], TExtended>(rows[0], extended);
  }

  async describe() {
    const [info, tablesInfo] = await Promise.all([this.showInfo(true), this.showTablesInfo(true)]);

    return {
      ...info,
      tables: await Promise.all(
        tablesInfo.map(async (table) => ({ ...table, columns: await this.table(table.name).showColumnsInfo() })),
      ),
    };
  }

  drop(): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Database.drop(this._connection, this.name);
  }

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
    return new Table(this._connection, this.name, name, this._ai);
  }

  async showTablesInfo<TExtended extends boolean = false>(extended?: TExtended) {
    const clauses = [`SHOW TABLES IN ${this.name}`];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => Table.normalizeInfo<DatabaseTableName<TDatabaseType>, TExtended>(row, extended));
  }

  createTable<TType extends TableType = TableType>(schema: TableSchema<TType>): Promise<Table<TType, TDatabaseType, TAi>> {
    return Table.create(this._connection, this.name, schema, this._ai);
  }

  dropTable(name: DatabaseTableName<TDatabaseType> | (string & {})): Promise<[ResultSetHeader, FieldPacket[]]> {
    return Table.drop(this._connection, this.name, name);
  }

  async query<T extends any[]>(statement: string): Promise<T[]> {
    const statements = [`USE ${this.name}`, statement].join(";\n");
    const [rows] = await this._connection.client.execute<T>(statements);
    return rows.slice(1) as T[];
  }
}
