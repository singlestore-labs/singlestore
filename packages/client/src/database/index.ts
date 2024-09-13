import { Tail } from "@repo/utils";
import { ResultSetHeader } from "mysql2/promise";

import type { ConnectionClient } from "../connection";
import type { AnyAI } from "@singlestore/ai";

import { WorkspaceSchema } from "../workspace";

export interface DatabaseSchema {
  name: string;
  tables: { [K in string]: any };
}

export interface DatabaseInfo<T extends DatabaseSchema["name"]> {
  name: T;
}

export interface DatabaseInfoExtended<T extends DatabaseSchema["name"]> extends DatabaseInfo<T> {
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

// export type InferDatabaseSchema<T> = T extends Database<infer U, any> ? U : never;

export type DatabaseTableName<TSchema extends DatabaseSchema> = Extract<keyof TSchema["tables"], string>;

export class Database<
  TSchema extends DatabaseSchema,
  TWorkspaceName extends WorkspaceSchema["name"] | undefined,
  TAI extends AnyAI | undefined,
> {
  constructor(
    private _client: ConnectionClient,
    private _ai: TAI,
    public name: TSchema["name"],
    public workspaceName: TWorkspaceName,
  ) {}

  static async drop(client: ConnectionClient, name: DatabaseSchema["name"]) {
    return client.execute<ResultSetHeader>(`DROP DATABASE IF EXISTS ${name}`);
  }

  static normalizeInfo<TName extends string, TExtended extends boolean>(
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

  async drop(...args: Tail<Parameters<typeof Database.drop>>) {
    return Database.drop(this._client, ...args);
  }

  async showInfo<TExtended extends boolean = false>(
    extended?: TExtended,
  ): Promise<TExtended extends true ? DatabaseInfoExtended<TSchema["name"]> : DatabaseInfo<TSchema["name"]>> {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    clauses.push(`LIKE '${this.name}'`);
    const [rows] = await this._client.query<any[]>(clauses.join(" "));
    return Database.normalizeInfo<TSchema["name"], TExtended>(rows[0], extended);
  }

  // async describe() {
  //   const [info, tablesInfo] = await Promise.all([this.showInfo(true), this.showTablesInfo(true)]);

  //   return {
  //     ...info,
  //     tables: await Promise.all(
  //       tablesInfo.map(async (table) => ({ ...table, columns: await this.table(table.name).showColumnsInfo() })),
  //     ),
  //   };
  // }

  async query<T extends any[]>(statement: string): Promise<T[]> {
    const statements = [`USE ${this.name}`, statement].join(";\n");
    const [rows] = await this._client.execute<T>(statements);
    return rows.slice(1) as T[];
  }
}
