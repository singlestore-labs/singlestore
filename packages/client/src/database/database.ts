import { ResultSetHeader } from "mysql2/promise";

import type { ConnectionClient } from "../connection";
import type { WorkspaceSchema } from "../workspace";
import type { AnyAI } from "@singlestore/ai";

import { type TableType, type CreateTableSchema, TableManager, Table } from "../table";

export type DatabaseName = string;

export interface DatabaseType {
  name: DatabaseName;
  tables: Record<PropertyKey, TableType>;
}

export interface DatabaseSchema<TType extends DatabaseType> {
  name: TType["name"];
  tables?: {
    [K in keyof TType["tables"]]: Omit<CreateTableSchema<Extract<K, string>, TType["tables"][K]>, "name">;
  };
}

export interface DatabaseInfo<TType extends DatabaseType> {
  name: TType["name"];
}

export interface DatabaseInfoExtended<TType extends DatabaseType> extends DatabaseInfo<TType> {
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

export type DatabaseTableName<TType extends DatabaseType> = Extract<keyof TType["tables"], string>;

export type InferDatabaseType<T> = T extends Database<infer TType, any, any> ? TType : never;

export type DatabaseTablesToRecords<TTables extends DatabaseType["tables"]> = { [K in keyof TTables]: TTables[K][] };

export type AnyDatabase = Database<DatabaseType, any, any>;

export class Database<
  TType extends DatabaseType,
  TWorkspaceName extends WorkspaceSchema["name"] | undefined,
  TAI extends AnyAI | undefined,
> {
  table: TableManager<TType, TAI>;

  constructor(
    private _client: ConnectionClient,
    private _ai: TAI,
    public name: TType["name"],
    public workspaceName: TWorkspaceName,
  ) {
    this.table = new TableManager(this._client, this._ai, this.name);
  }

  static async drop<TName extends DatabaseName>(client: ConnectionClient, name: TName) {
    return client.execute<ResultSetHeader>(`DROP DATABASE IF EXISTS ${name}`);
  }

  static normalizeInfo<
    TType extends DatabaseType,
    TExtended extends boolean,
    _ReturnType = TExtended extends true ? DatabaseInfoExtended<TType> : DatabaseInfo<TType>,
  >(info: any, extended?: TExtended): _ReturnType {
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

  async drop(...args: Parameters<typeof Database.drop> extends [any, any, ...infer Rest] ? Rest : never) {
    return Database.drop(this._client, this.name, ...args);
  }

  async showInfo<TExtended extends boolean = false>(extended?: TExtended) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._client.query<any[]>(clauses.join(" "));
    return Database.normalizeInfo<TType, TExtended>(rows[0], extended);
  }

  async showTablesInfo<TExtended extends boolean = false>(extended?: TExtended) {
    const clauses = [`SHOW TABLES IN ${this.name}`];
    if (extended) clauses.push("EXTENDED");
    const [rows] = await this._client.query<any[]>(clauses.join(" "));
    return rows.map((row) => {
      return Table.normalizeInfo<Extract<keyof TType["tables"], string>, TExtended>(row, extended);
    });
  }

  async describe() {
    const [info, tablesInfo] = await Promise.all([this.showInfo(true), this.showTablesInfo(true)]);

    return {
      ...info,
      tables: await Promise.all(
        tablesInfo.map(async (tableInfo) => {
          const table = this.table.use(tableInfo.name);
          return { ...tableInfo, columns: await table.showColumnsInfo() };
        }),
      ),
    };
  }

  async query<TReturnType extends any[]>(statement: string) {
    const statements = [`USE ${this.name}`, statement].join(";\n");
    const [rows] = await this._client.execute<TReturnType>(statements);
    return rows.slice(1) as TReturnType[];
  }
}
