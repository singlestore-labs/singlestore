import { WorkspaceConnection } from "./connection";

export interface WorkspaceColumnSchema {
  name: string;
  type?: string;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  default?: any;
  definitions?: string[];
}

export class WorkspaceColumn<T extends WorkspaceConnection, U extends string, N extends WorkspaceColumnSchema["name"]> {
  constructor(
    private _connection: T,
    private _tablePath: U,
    public name: N,
  ) {}

  static schemaToQueryDefinition(schema: WorkspaceColumnSchema) {
    const definitions: string[] = [schema.name];
    if (schema.type) definitions.push(schema.type);
    if (schema.nullable !== undefined && !schema.nullable) definitions.push("NOT NULL");
    if (schema.primaryKey) definitions.push("PRIMARY KEY");
    if (schema.autoIncrement) definitions.push("AUTO_INCREMENT");
    if (schema.default !== undefined) definitions.push(`DEFAULT ${schema.default}`);
    return [...definitions, ...(schema.definitions || [])].filter(Boolean).join(" ");
  }

  static async add<T extends WorkspaceConnection, U extends string, S extends WorkspaceColumnSchema>(
    connection: T,
    tablePath: U,
    schema: S,
  ) {
    const definition = WorkspaceColumn.schemaToQueryDefinition(schema);
    await connection.client.execute(`\
      ALTER TABLE ${tablePath} ADD COLUMN ${definition}
    `);
    return new WorkspaceColumn(connection, tablePath, schema.name);
  }

  static async drop(connection: WorkspaceConnection, tablePath: string, name: WorkspaceColumnSchema["name"]) {
    await connection.client.execute(`\
      ALTER TABLE ${tablePath} DROP COLUMN ${name}
    `);
  }

  async modify(schema: Partial<Omit<WorkspaceColumnSchema, "name">>) {
    const definition = WorkspaceColumn.schemaToQueryDefinition({ ...schema, name: this.name });
    await this._connection.client.execute(`\
      ALTER TABLE ${this._tablePath} MODIFY COLUMN ${definition}
    `);
  }

  async rename(newName: WorkspaceColumnSchema["name"]) {
    await this._connection.client.execute(`\
      ALTER TABLE ${this._tablePath} CHANGE ${this.name} ${newName}
    `);
  }

  async drop() {
    await WorkspaceColumn.drop(this._connection, this._tablePath, this.name);
  }
}
