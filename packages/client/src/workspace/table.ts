import { FlexKeyOf } from "../types/helpers";
import { WorkspaceColumn, WorkspaceColumnSchema } from "./column";
import { WorkspaceConnection } from "./connection";

export interface WorkspaceTableSchema<T extends Record<string, WorkspaceColumnSchema> = Record<string, WorkspaceColumnSchema>> {
  name: string;
  columns: T;
  primaryKeys?: string[];
  fulltextKeys?: string[];
  definitions?: string[];
}

export class WorkspaceTable<T extends WorkspaceTableSchema> {
  private _path: string;

  constructor(
    private _connection: WorkspaceConnection,
    private _dbName: string,
    public name: T["name"],
  ) {
    this._path = `${this._dbName}.${this.name}`;
  }

  static schemaToQueryDefinition(schema: WorkspaceTableSchema) {
    const definitions: string[] = [
      ...Object.entries(schema.columns).map(([name, schema]) => {
        return WorkspaceColumn.schemaToQueryDefinition({ ...schema, name });
      }),
    ];
    if (schema.primaryKeys?.length) definitions.push(`PRIMARY KEY (${schema.primaryKeys.join(", ")})`);
    if (schema.fulltextKeys?.length) definitions.push(`FULLTEXT KEY (${schema.fulltextKeys.join(", ")})`);
    return [...definitions, ...(schema.definitions || [])].filter(Boolean).join(", ");
  }

  static async create<T extends WorkspaceTableSchema>(connection: WorkspaceConnection, dbName: string, schema: T) {
    const definition = WorkspaceTable.schemaToQueryDefinition(schema);
    await connection.client.execute(`\
      CREATE TABLE IF NOT EXISTS ${dbName}.${schema.name} (${definition})
    `);
    return new WorkspaceTable<T>(connection, dbName, schema.name);
  }

  static async drop(connection: WorkspaceConnection, dbName: string, name: WorkspaceTableSchema["name"]) {
    await connection.client.execute(`\
      DROP TABLE IF EXISTS ${dbName}.${name}
    `);
  }

  async drop() {
    await WorkspaceTable.drop(this._connection, this._dbName, this.name);
  }

  column<U extends FlexKeyOf<T["columns"]>>(name: U) {
    return new WorkspaceColumn<T["columns"][U]>(this._connection, this._path, name);
  }

  addColumn<T extends WorkspaceColumnSchema>(schema: T) {
    return WorkspaceColumn.add<T>(this._connection, this._path, schema);
  }

  dropColumn(name: FlexKeyOf<T["columns"]>) {
    return WorkspaceColumn.drop(this._connection, this._path, name);
  }

  async truncate() {
    await this._connection.client.execute(`\
      TRUNCATE TABLE ${this._path}
    `);
  }

  async rename(newName: WorkspaceTableSchema["name"]) {
    await this._connection.client.execute(`\
      ALTER TABLE ${this._path} RENAME TO ${newName}
    `);
  }
}
