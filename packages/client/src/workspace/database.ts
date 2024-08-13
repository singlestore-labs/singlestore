import type { WorkspaceConnection } from "./connection";
import type { AI } from "@singlestore/ai";
import type { ResultSetHeader } from "mysql2/promise";

import { WorkspaceTable, type WorkspaceTableSchema, type WorkspaceTableType } from "./table";

export type DatabaseTablesToRecords<T extends WorkspaceDatabaseType["tables"]> = { [K in keyof T]: T[K]["columns"][] };

export interface WorkspaceDatabaseType {
  tables: Record<string, WorkspaceTableType>;
}

export interface WorkspaceDatabaseSchema<T extends WorkspaceDatabaseType> {
  name: string;
  tables?: { [K in keyof T["tables"]]: Omit<WorkspaceTableSchema<T["tables"][K]>, "name"> };
}

export interface WorkspaceDatabaseInfo<T extends string> {
  name: T;
}

export interface WorkspaceDatabaseInfoExtended<T extends string> extends WorkspaceDatabaseInfo<T> {
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

export class WorkspaceDatabase<
  T extends WorkspaceDatabaseType = WorkspaceDatabaseType,
  U extends AI = AI,
  _TableNames extends Extract<keyof T["tables"], string> = Extract<keyof T["tables"], string>,
> {
  constructor(
    private _connection: WorkspaceConnection,
    public name: string,
    public workspaceName?: string,
    private _ai?: U,
  ) {}

  static normalizeInfo<
    T extends string,
    U extends boolean,
    _ReturnType = U extends true ? WorkspaceDatabaseInfoExtended<T> : WorkspaceDatabaseInfo<T>,
  >(info: any, extended?: U) {
    const name = info[Object.keys(info).find((key) => key.startsWith("Database")) as string];
    if (!extended) return { name } as _ReturnType;

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
    } as _ReturnType;
  }

  static async create<T extends WorkspaceDatabaseType, U extends AI = AI>(
    connection: WorkspaceConnection,
    schema: WorkspaceDatabaseSchema<T>,
    workspaceName?: string,
    ai?: U,
  ) {
    const clauses: string[] = [`CREATE DATABASE IF NOT EXISTS ${schema.name}`];
    if (workspaceName) clauses.push(`ON WORKSPACE \`${workspaceName}\``);
    await connection.client.execute<ResultSetHeader>(clauses.join(" "));

    if (schema.tables) {
      await Promise.all(
        Object.entries(schema.tables).map(([name, tableSchema]) => {
          return WorkspaceTable.create(connection, schema.name, { ...tableSchema, name });
        }),
      );
    }

    return new WorkspaceDatabase<T, U>(connection, schema.name, workspaceName, ai);
  }

  static drop(connection: WorkspaceConnection, name: string) {
    return connection.client.execute<ResultSetHeader>(`DROP DATABASE IF EXISTS ${name}`);
  }

  async showInfo<U extends boolean>(extended?: U) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return WorkspaceDatabase.normalizeInfo<string, U>(rows[0], extended);
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
    return WorkspaceDatabase.drop(this._connection, this.name);
  }

  table<N, K extends _TableNames | (string & {}) = _TableNames | (string & {})>(name: K) {
    return new WorkspaceTable<N extends WorkspaceTableType ? N : T["tables"][K], U>(
      this._connection,
      this.name,
      name as string,
      this._ai,
    );
  }

  async showTablesInfo<U extends boolean>(extended?: U) {
    const clauses = [`SHOW TABLES IN ${this.name}`];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this._connection.client.query<any[]>(clauses.join(" "));
    return rows.map((row) => WorkspaceTable.normalizeInfo<_TableNames, U>(row, extended));
  }

  createTable<T extends WorkspaceTableType>(schema: WorkspaceTableSchema<T>) {
    return WorkspaceTable.create<T, U>(this._connection, this.name, schema, this._ai);
  }

  dropTable(name: _TableNames | ({} & string)) {
    return WorkspaceTable.drop(this._connection, this.name, name);
  }

  async query<T extends any[]>(statement: string) {
    const statements = [`USE ${this.name}`, statement].join(";\n");
    const result = await this._connection.client.execute<T>(statements);
    return result[0].slice(1) as T;
  }
}
