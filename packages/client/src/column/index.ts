import type { ConnectionClient } from "../connection";
import type { DatabaseName } from "../database";
import type { TableName } from "../table";
import type { FieldPacket, ResultSetHeader } from "mysql2/promise";

export type ColumnName = string;

export type ColumnType = any;

export interface ColumnSchema {
  name: ColumnName;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  default: any;
  clauses: string[];
}

export interface ColumnInfo<TName extends ColumnName> {
  name: TName;
  type: string;
  null: string;
  key: string;
  default: any;
  extra: string;
}

export class Column<TName extends ColumnName, TTableName extends TableName, TDatabaseName extends DatabaseName> {
  constructor(
    private _client: ConnectionClient,
    private _path: string,
    public name: TName,
    public tableName: TTableName,
    public databaseName: TDatabaseName,
  ) {}

  static schemaToClauses(schema: Partial<ColumnSchema>): string {
    const clauses: string[] = [`\`${schema.name}\``];
    if (schema.type) clauses.push(schema.type);
    if (schema.nullable !== undefined && !schema.nullable) clauses.push("NOT NULL");
    if (schema.primaryKey) clauses.push("PRIMARY KEY");
    if (schema.autoIncrement) clauses.push("AUTO_INCREMENT");
    if (schema.default !== undefined) clauses.push(`DEFAULT ${schema.default}`);
    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(" ");
  }

  static async drop<TName extends ColumnName, TTableName extends TableName, TDatabaseName extends DatabaseName>(
    client: ConnectionClient,
    databaseName: TDatabaseName,
    tableName: TTableName,
    name: TName,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    return client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${tableName} DROP COLUMN ${name}
    `);
  }

  static normalizeInfo<TName extends ColumnName>(info: any): ColumnInfo<TName> {
    return {
      name: info.Field,
      type: info.Type,
      null: info.Null,
      key: info.Key,
      default: info.Default,
      extra: info.Extra,
    };
  }

  static async modify<TName extends ColumnName>(
    client: ConnectionClient,
    path: string,
    name: TName,
    schema: Partial<Omit<ColumnSchema, "name">>,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const clauses = Column.schemaToClauses({ type: "", ...schema, name });

    return client.execute<ResultSetHeader>(`\
      ALTER TABLE ${path} MODIFY COLUMN ${clauses}
    `);
  }

  static async rename<TName extends ColumnName>(
    client: ConnectionClient,
    path: string,
    name: TName,
    newName: ColumnName,
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    const result = await client.execute<ResultSetHeader>(`\
      ALTER TABLE ${path} CHANGE ${name} ${newName}
    `);

    return result;
  }

  static async showInfo<TName extends ColumnName, TTableName extends TableName, TDatabaseName extends DatabaseName>(
    client: ConnectionClient,
    databaseName: TDatabaseName,
    tableName: TTableName,
    name: TName,
  ): Promise<ColumnInfo<TName>> {
    const [rows] = await client.query<any[]>(`SHOW COLUMNS IN ${tableName} IN ${databaseName} LIKE '${name}'`);
    return Column.normalizeInfo<TName>(rows[0]);
  }

  async drop() {
    return Column.drop(this._client, this.databaseName, this.tableName, this.name);
  }

  async modify(...args: Parameters<typeof Column.modify> extends [any, any, any, ...infer Rest] ? Rest : never) {
    return Column.modify(this._client, this._path, this.name, ...args);
  }

  async rename(...[newName, ...args]: Parameters<typeof Column.rename> extends [any, any, any, ...infer Rest] ? Rest : never) {
    const result = await Column.rename(this._client, this._path, this.name, newName, ...args);
    this.name = newName as TName;
    return result;
  }

  async showInfo() {
    return Column.showInfo<TName, TTableName, TDatabaseName>(this._client, this.databaseName, this.tableName, this.name);
  }
}
