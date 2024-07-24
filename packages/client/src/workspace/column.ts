import { ResultSetHeader } from "mysql2";
import { WorkspaceConnection } from "./connection";

export interface WorkspaceColumnType {}

export interface WorkspaceColumnSchema<T extends WorkspaceColumnType = WorkspaceColumnType> {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  default?: any;
  clauses?: string[];
}

export class WorkspaceColumn<T extends WorkspaceColumnType = WorkspaceColumnType> {
  constructor(
    private _connection: WorkspaceConnection,
    private _tablePath: string,
    public name: string,
  ) {}

  static schemaToClauses(schema: WorkspaceColumnSchema) {
    const clauses: string[] = [`\`${schema.name}\``];
    if (schema.type) clauses.push(schema.type);
    if (schema.nullable !== undefined && !schema.nullable) clauses.push("NOT NULL");
    if (schema.primaryKey) clauses.push("PRIMARY KEY");
    if (schema.autoIncrement) clauses.push("AUTO_INCREMENT");
    if (schema.default !== undefined) clauses.push(`DEFAULT ${schema.default}`);
    return [...clauses, ...(schema.clauses || [])].filter(Boolean).join(" ");
  }

  static async add<T extends WorkspaceColumnType = WorkspaceColumnType>(
    connection: WorkspaceConnection,
    tablePath: string,
    schema: WorkspaceColumnSchema<T>,
  ) {
    const clauses = WorkspaceColumn.schemaToClauses(schema);
    await connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${tablePath} ADD COLUMN ${clauses}
    `);
    return new WorkspaceColumn<T>(connection, tablePath, schema.name);
  }

  static drop(connection: WorkspaceConnection, tablePath: string, name: WorkspaceColumnSchema["name"]) {
    return connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${tablePath} DROP COLUMN ${name}
    `);
  }

  drop() {
    return WorkspaceColumn.drop(this._connection, this._tablePath, this.name);
  }

  modify(schema: Partial<Omit<WorkspaceColumnSchema, "name">>) {
    const clauses = WorkspaceColumn.schemaToClauses({ type: "", ...schema, name: this.name });
    return this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._tablePath} MODIFY COLUMN ${clauses}
    `);
  }

  rename(newName: WorkspaceColumnSchema["name"]) {
    return this._connection.client.execute<ResultSetHeader>(`\
      ALTER TABLE ${this._tablePath} CHANGE ${this.name} ${newName}
    `);
  }
}
