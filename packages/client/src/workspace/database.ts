import type { ResultSetHeader } from "mysql2/promise";
import type { AI } from "@singlestore/ai";
import type { WorkspaceConnection } from "./connection";
import {
  WorkspaceTable,
  type WorkspaceTableSchema,
  type WorkspaceTableType,
  type WorksaceTableShowInfoExtended,
} from "./table";

export type DatabaseTablesToRecords<T extends WorkspaceDatabaseType["tables"]> = { [K in keyof T]: T[K]["columns"][] };

export interface WorkspaceDatabaseType {
  tables: Record<string, WorkspaceTableType>;
}

export interface WorkspaceDatabaseSchema<T extends WorkspaceDatabaseType> {
  name: string;
  tables?: { [K in keyof T["tables"]]: Omit<WorkspaceTableSchema<T["tables"][K]>, "name"> };
}

export interface WorkspaceDatabaseShowInfo {
  name: string;
}

export interface WorkspaceDatabaseShowInfoExtended extends WorkspaceDatabaseShowInfo {
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
  tables: WorksaceTableShowInfoExtended[];
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

  static async showInfo<
    K extends boolean,
    _ReturnType = K extends true ? WorkspaceDatabaseShowInfoExtended : WorkspaceDatabaseShowInfo,
  >(connection: WorkspaceConnection, databaseName: string, extended?: K) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${databaseName}'`);

    const [rows] = await connection.client.query<any[]>(clauses.join(" "));
    const name = rows[0][Object.keys(rows[0]).find((key) => key.startsWith(`Database`)) as string];
    if (!extended) return { name } as _ReturnType;

    const [tableRows] = await connection.client.query<any[]>(`SHOW TABLES IN ${databaseName}`);

    return {
      name,
      commits: rows[0].Commits,
      role: rows[0].Role,
      state: rows[0].State,
      position: rows[0].Position,
      details: rows[0].Details,
      asyncSlaves: rows[0].AsyncSlaves,
      syncSlaves: rows[0].SyncSlaves,
      consensusSlaves: rows[0].ConsensusSlaves,
      committedPosition: rows[0].CommittedPosition,
      hardenedPosition: rows[0].HardenedPosition,
      replayPosition: rows[0].ReplayPosition,
      term: rows[0].Term,
      lastPageTerm: rows[0].LastPageTerm,
      memoryMBs: rows[0]["Memory (MBs)"],
      pendingIOs: rows[0]["Pending IOs"],
      pendingBlobFSyncs: rows[0]["Pending blob fsyncs"],
      tables: await Promise.all(
        tableRows.map((row) => {
          const tableName = Object.values(row)[0] as string;
          return WorkspaceTable.showInfo(connection, databaseName, tableName, true);
        }),
      ),
    } as _ReturnType;
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

  showInfo<U extends boolean>(extended?: U) {
    return WorkspaceDatabase.showInfo(this._connection, this.name, extended);
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
