import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { AI } from "@singlestore/ai";
import type { WorkspaceConnection } from "./connection";
import { WorkspaceTable, type WorkspaceTableSchema, type WorkspaceTableType } from "./table";

export type DatabaseTablesToRecords<T extends WorkspaceDatabaseType["tables"]> = { [K in keyof T]: T[K]["columns"][] };

export interface WorkspaceDatabaseType {
  tables: Record<string, WorkspaceTableType>;
}

export interface WorkspaceDatabaseSchema<T extends WorkspaceDatabaseType> {
  name: string;
  tables?: { [K in keyof T["tables"]]: Omit<WorkspaceTableSchema<T["tables"][K]>, "name"> };
}

export interface DatabaseShowInfo<T extends string = string> {
  name: T;
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
  _TableNames extends Extract<keyof T["tables"], string> = Extract<keyof T["tables"], string>,
> {
  constructor(
    private _connection: WorkspaceConnection,
    public name: string,
    public workspaceName?: string,
    private _ai?: AI,
  ) {}

  static normalizeShowInfo<T extends string, U extends boolean>(info: { Database: T; [K: string]: any }, extended?: U) {
    let result = { name: info.Database } as any;

    if (extended) {
      result = {
        ...result,
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
      };
    }

    return result as U extends true ? DatabaseShowInfo<T> : Pick<DatabaseShowInfo<T>, "name">;
  }

  static async create<T extends WorkspaceDatabaseType>(
    connection: WorkspaceConnection,
    schema: WorkspaceDatabaseSchema<T>,
    workspaceName?: string,
    ai?: AI,
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

    return new WorkspaceDatabase<T>(connection, schema.name, workspaceName, ai);
  }

  static drop(connection: WorkspaceConnection, name: string) {
    return connection.client.execute<ResultSetHeader>(`DROP DATABASE IF EXISTS ${name}`);
  }

  async showInfo<U extends boolean>(extended?: U) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const result = await this._connection.client.query<(any & RowDataPacket)[]>(clauses.join(" "));
    return WorkspaceDatabase.normalizeShowInfo<string, U>({ ...result[0][0], Database: this.name }, extended);
  }

  drop() {
    return WorkspaceDatabase.drop(this._connection, this.name);
  }

  table<U, K extends _TableNames | (string & {}) = _TableNames | (string & {})>(name: K) {
    return new WorkspaceTable<U extends WorkspaceTableType ? U : T["tables"][K]>(
      this._connection,
      this.name,
      name as string,
      this._ai,
    );
  }

  async showTablesInfo<U extends boolean>(extended?: U) {
    const clauses = [`SHOW TABLES IN ${this.name}`];
    if (extended) clauses.push("EXTENDED");
    const result = await this._connection.client.query<(any & RowDataPacket)[]>(clauses.join(" "));
    return result[0].map((result) => WorkspaceTable.normalizeShowInfo<_TableNames, U>(result, extended));
  }

  createTable<T extends WorkspaceTableType>(schema: WorkspaceTableSchema<T>) {
    return WorkspaceTable.create<T>(this._connection, this.name, schema, this._ai);
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
