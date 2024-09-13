import { ResultSetHeader } from "mysql2/promise";

import type { ConnectionClient } from "../connection";
import type { DatabaseSchema, DatabaseTableName } from "../database";
import type { AnyAI } from "@singlestore/ai";

import { Table, type TableSchema } from ".";

export class TableManager<TDatabaseSchema extends DatabaseSchema, TAI extends AnyAI | undefined> {
  constructor(
    private _client: ConnectionClient,
    private _ai: TAI,
    public databaseName: TDatabaseSchema["name"],
  ) {}

  use<TName extends DatabaseTableName<TDatabaseSchema> | (TableSchema["name"] & {})>(name: TName) {
    return new Table(this._client, this.databaseName, name as TName, this._ai);
  }

  async create<TSchema extends TableSchema>(schema: TSchema) {
    const clauses = Table.schemaToClauses(schema);

    await this._client.execute<ResultSetHeader>(`\
      CREATE TABLE IF NOT EXISTS ${this.databaseName}.${schema.name} (${clauses})
    `);

    return new Table(this._client, this.databaseName, schema.name as TSchema["name"], this._ai);
  }

  async drop(
    name: DatabaseTableName<TDatabaseSchema> | (TableSchema["name"] & {}),
    ...args: Parameters<typeof Table.drop> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Table.drop(this._client, this.databaseName, name, ...args);
  }

  async truncate(
    name: DatabaseTableName<TDatabaseSchema> | (TableSchema["name"] & {}),
    ...args: Parameters<typeof Table.truncate> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Table.truncate(this._client, this.databaseName, name, ...args);
  }

  async rename(
    name: DatabaseTableName<TDatabaseSchema> | (TableSchema["name"] & {}),
    ...args: Parameters<typeof Table.rename> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Table.rename(this._client, this.databaseName, name, ...args);
  }
}
