import type { AnyAI } from "@singlestore/ai";
import type { ResultSetHeader } from "mysql2/promise";

import { Connection } from "./connection";
import { Table, type TableSchema, type TableType } from "./table";

export interface DatabaseType<T extends Record<string, TableType> = Record<string, TableType>> {
  tables: T;
}

export interface DatabaseSchema<T extends DatabaseType> {
  name: string;
  tables?: { [K in keyof T["tables"]]: Omit<TableSchema<T["tables"][K]>, "name"> };
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

export type DatabaseTablesToRecords<T extends DatabaseType["tables"]> = { [K in keyof T]: T[K]["columns"][] };

export type AnyDatabase = Database<DatabaseType<any>, AnyAI | undefined>;

export type DatabaseTableName<T extends DatabaseType> = Extract<keyof T["tables"], string>;

export class Database<T extends DatabaseType = DatabaseType, U extends AnyAI | undefined = undefined> {
  constructor(
    private _connection: Connection,
    public name: string,
    public workspaceName?: string,
    private _ai?: U,
  ) {}

  static normalizeInfo<T extends string, U extends boolean>(info: any, extended?: U) {
    type Result<T extends string, U extends boolean> = U extends true ? DatabaseInfoExtended<T> : DatabaseInfo<T>;
    const name = info[Object.keys(info).find((key) => key.startsWith("Database")) as string];
    if (!extended) return { name } as Result<T, U>;

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
    } as Result<T, U>;
  }

  static async create<T extends DatabaseType = DatabaseType, U extends AnyAI | undefined = undefined>(
    connection: Connection,
    schema: DatabaseSchema<T>,
    workspaceName?: string,
    ai?: U,
  ) {
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

    return new Database<T, U>(connection, schema.name, workspaceName, ai);
  }

  static drop(connection: Connection, name: string) {
    return connection.client.execute<ResultSetHeader>(`DROP DATABASE IF EXISTS ${name}`);
  }

  async showInfo<T extends boolean>(extended?: T) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return Database.normalizeInfo<string, T>(rows[0], extended);
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

  drop() {
    return Database.drop(this._connection, this.name);
  }

  table<N, K extends DatabaseTableName<T> | (string & {}) = DatabaseTableName<T> | (string & {})>(name: K) {
    type _TableType = N extends TableType ? N : T["tables"][K] extends TableType ? T["tables"][K] : TableType;
    return new Table<_TableType, U>(this._connection, this.name, name, this._ai);
  }

  async showTablesInfo<U extends boolean>(extended?: U) {
    const clauses = [`SHOW TABLES IN ${this.name}`];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => Table.normalizeInfo<DatabaseTableName<T>, U>(row, extended));
  }

  createTable<T extends TableType = TableType>(schema: TableSchema<T>) {
    return Table.create<T, U>(this._connection, this.name, schema, this._ai);
  }

  dropTable(name: DatabaseTableName<T> | (string & {})) {
    return Table.drop(this._connection, this.name, name);
  }

  async query<T extends any[]>(statement: string) {
    const statements = [`USE ${this.name}`, statement].join(";\n");
    const [rows] = await this._connection.client.execute<T>(statements);
    return rows.slice(1) as T;
  }
}
