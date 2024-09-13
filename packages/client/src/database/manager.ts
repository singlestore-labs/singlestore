import { type AnyAI } from "@singlestore/ai";

import type { ConnectionClient } from "../connection";
import type { WorkspaceSchema } from "../workspace";
import type { Tail } from "@repo/utils";
import type { ResultSetHeader } from "mysql2/promise";

import { Database, type DatabaseSchema } from ".";

export class DatabaseManager<TWorkspaceName extends WorkspaceSchema["name"] | undefined, TAI extends AnyAI | undefined> {
  constructor(
    private _client: ConnectionClient,
    private _ai: TAI,
    public workspaceName: TWorkspaceName,
  ) {}

  static async create<
    TSchema extends DatabaseSchema,
    TWorkspaceName extends WorkspaceSchema["name"] | undefined = undefined,
    TAI extends AnyAI | undefined = undefined,
  >(client: ConnectionClient, schema: TSchema, workspaceName?: TWorkspaceName, ai?: TAI) {
    const clauses: string[] = [`CREATE DATABASE IF NOT EXISTS ${schema.name}`];
    if (workspaceName) clauses.push(`ON WORKSPACE \`${workspaceName}\``);
    await client.execute<ResultSetHeader>(clauses.join(" "));

    // if (schema.tables) {
    //   await Promise.all(
    //     Object.entries(schema.tables).map(([name, tableSchema]) => {
    //       return Table.create(connection, schema.name, { ...tableSchema, name });
    //     }),
    //   );
    // }

    return new Database(client, ai as TAI, schema.name as TSchema["name"], workspaceName as TWorkspaceName);
  }

  async create<TSchema extends DatabaseSchema>(
    ...args: Tail<Parameters<typeof DatabaseManager.create<TSchema, TWorkspaceName, TAI>>>
  ) {
    return DatabaseManager.create(this._client, ...args);
  }

  use<TSchema extends DatabaseSchema>(name: TSchema["name"]) {
    return new Database<TSchema, TWorkspaceName, TAI>(this._client, this._ai, name, this.workspaceName);
  }

  drop(...args: Tail<Parameters<typeof Database.drop>>) {
    return Database.drop(this._client, ...args);
  }
}
