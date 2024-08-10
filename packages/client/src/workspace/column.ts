import type { ResultSetHeader } from "mysql2/promise";
import type { WorkspaceConnection } from "./connection";

export type WorkspaceColumnType = any;

export interface WorkspaceColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  default?: any;
  clauses?: string[];
}

export interface WorkspaceColumnShowInfo {
  name: string;
  type: string;
  null: string;
  key: string;
  default: any;
  extra: string;
}

export class WorkspaceColumn {
  private _path: string;

  constructor(
    private _connection: WorkspaceConnection,
    public databaseName: string,
    public tableName: string,
    public name: string,
  ) {
    this._path = [databaseName, tableName].join(".");
  }

  static schemaToClauses(schema: WorkspaceColumnSchema) {
    const clauses: string[] = [`\`${schema.name}\``];
    if (schema.type) clauses.push(schema.type);
    if (schema.nullable !== undefined && !schema.nullable) clauses.push("NOT NULL");
    if (schema.primaryKey) clauses.push("PRIMARY KEY");
    if (schema.autoIncrement) clauses.push("AUTO_INCREMENT");
    if (schema.default !== undefined) clauses.push(`DEFAULT ${schema.default}`);
    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(" ");
  }

  static async showInfo(
    connection: WorkspaceConnection,
    databaseName: string,
    tableName: string,
    columnName: string,
  ): Promise<WorkspaceColumnShowInfo> {
    const [rows] = await connection.client.query<any[]>(`SHOW COLUMNS IN ${tableName} IN ${databaseName} LIKE '${columnName}'`);
    return {
      name: rows[0].Field,
      type: rows[0].Type,
      null: rows[0].Null,
      key: rows[0].Key,
      default: rows[0].Default,
      extra: rows[0].Extra,
    };
  }

  static async add(connection: WorkspaceConnection, databaseName: string, tableName: string, schema: WorkspaceColumnSchema) {
    const clauses = WorkspaceColumn.schemaToClauses(schema);
    await connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${tableName} ADD COLUMN ${clauses}
    `);
    return new WorkspaceColumn(connection, databaseName, tableName, schema.name);
  }

  static drop(connection: WorkspaceConnection, databaseName: string, tableName: string, name: string) {
    return connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${databaseName}.${tableName} DROP COLUMN ${name}
    `);
  }

  showInfo() {
    return WorkspaceColumn.showInfo(this._connection, this.databaseName, this.tableName, this.name);
  }

  drop() {
    return WorkspaceColumn.drop(this._connection, this.databaseName, this.tableName, this.name);
  }

  modify(schema: Partial<Omit<WorkspaceColumnSchema, "name">>) {
    const clauses = WorkspaceColumn.schemaToClauses({ type: "", ...schema, name: this.name });
    return this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} MODIFY COLUMN ${clauses}
    `);
  }

  async rename(newName: string) {
    const result = await this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._path} CHANGE ${this.name} ${newName}
    `);

    this.name = newName;

    return result;
  }
}
