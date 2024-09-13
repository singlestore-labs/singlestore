import { ResultSetHeader } from "mysql2/promise";

import type { ConnectionClient } from "../connection";
import type { DatabaseName } from "../database";
import type { TableColumnName, TableName, TableType } from "../table";

import { type AddColumnSchema, Column, type ColumnName } from ".";

export class ColumnManager<TTableName extends TableName, TTableType extends TableType, TDatabaseName extends DatabaseName> {
  private _path: string;

  constructor(
    private _client: ConnectionClient,
    public tableName: TTableName,
    public databaseName: TDatabaseName,
  ) {
    this._path = [databaseName, tableName].join(".");
  }

  use<TName extends TableColumnName<TTableType> | (ColumnName & {})>(name: TName) {
    return new Column<TName, TTableName, TDatabaseName>(this._client, this._path, name, this.tableName, this.databaseName);
  }

  async add<TSchema extends AddColumnSchema>(schema: TSchema) {
    const clauses = Column.schemaToClauses(schema);

    await this._client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this.databaseName}.${this.tableName} ADD COLUMN ${clauses}
    `);

    return new Column<TSchema["name"], TTableName, TDatabaseName>(
      this._client,
      this._path,
      schema.name,
      this.tableName,
      this.databaseName,
    );
  }

  async drop(name: TableColumnName<TTableType> | (ColumnName & {})) {
    return Column.drop(this._client, this.databaseName, this.tableName, name);
  }

  async modify(
    name: TableColumnName<TTableType> | (ColumnName & {}),
    ...args: Parameters<typeof Column.modify> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Column.modify(this._client, this._path, name, ...args);
  }

  async rename(
    name: TableColumnName<TTableType> | (ColumnName & {}),
    ...args: Parameters<typeof Column.rename> extends [any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Column.rename(this._client, this._path, name, ...args);
  }

  async showInfo<TName extends TableColumnName<TTableType> | (ColumnName & {})>(
    name: TName,
    ...args: Parameters<typeof Column.showInfo> extends [any, any, any, any, ...infer Rest] ? Rest : never
  ) {
    return Column.showInfo<TName, TTableName, TDatabaseName>(this._client, this.databaseName, this.tableName, name, ...args);
  }
}
