import { WorkspaceColumn, WorkspaceColumnSchema } from "./column";
import { WorkspaceConnection } from "./connection";

export interface WorkspaceTableSchema {
  name: string;
  columns: WorkspaceColumnSchema[];
  primaryKeys?: string[];
  fulltextKeys?: string[];
  definitions?: string[];
}

export class WorkspaceTable<T extends WorkspaceConnection, U extends string, N extends WorkspaceTableSchema["name"]> {
  private _path: string;

  constructor(
    private _connection: T,
    private _dbName: U,
    public name: N,
  ) {
    this._path = `${this._dbName}.${this.name}`;
  }

  column<T extends WorkspaceColumnSchema["name"]>(name: T) {
    return new WorkspaceColumn(this._connection, this._path, name);
  }

  async addColumn<T extends WorkspaceColumnSchema>(schema: T) {
    await WorkspaceColumn.add(this._connection, this._path, schema);
  }

  async dropColumn(name: WorkspaceColumnSchema["name"]) {
    await WorkspaceColumn.drop(this._connection, this._path, name);
  }

  static schemaToQueryDefinition(schema: WorkspaceTableSchema) {
    const definitions: string[] = [...schema.columns.map(WorkspaceColumn.schemaToQueryDefinition)];
    if (schema.primaryKeys?.length) definitions.push(`PRIMARY KEY (${schema.primaryKeys.join(", ")})`);
    if (schema.fulltextKeys?.length) definitions.push(`FULLTEXT KEY (${schema.fulltextKeys.join(", ")})`);

    return [...definitions, ...(schema.definitions || [])].filter(Boolean).join(", ");
  }

  static async create<T extends WorkspaceConnection, U extends string, S extends WorkspaceTableSchema>(
    connection: T,
    dbName: U,
    schema: S,
  ) {
    const definition = WorkspaceTable.schemaToQueryDefinition(schema);
    await connection.client.execute(`\
      CREATE TABLE IF NOT EXISTS ${dbName}.${schema.name} (${definition})
    `);
  }

  static async drop(connection: WorkspaceConnection, dbName: string, name: WorkspaceTableSchema["name"]) {
    await connection.client.execute(`\
      DROP TABLE IF EXISTS ${dbName}.${name}
    `);
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

  async drop() {
    await WorkspaceTable.drop(this._connection, this._dbName, this.name);
  }
}
