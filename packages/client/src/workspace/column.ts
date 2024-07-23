import { WorkspaceConnection } from "./connection";

export interface WorkspaceColumnType {}

export interface WorkspaceColumnSchema<T extends WorkspaceColumnType = WorkspaceColumnType> {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  default?: any;
  definitions?: string[];
}

export class WorkspaceColumn<T extends WorkspaceColumnType = WorkspaceColumnType> {
  constructor(
    private _connection: WorkspaceConnection,
    private _tablePath: string,
    public name: string,
  ) {}

  static schemaToQueryDefinition(schema: WorkspaceColumnSchema) {
    const definitions: string[] = [`\`${schema.name}\``];
    if (schema.type) definitions.push(schema.type);
    if (schema.nullable !== undefined && !schema.nullable) definitions.push("NOT NULL");
    if (schema.primaryKey) definitions.push("PRIMARY KEY");
    if (schema.autoIncrement) definitions.push("AUTO_INCREMENT");
    if (schema.default !== undefined) definitions.push(`DEFAULT ${schema.default}`);
    return [...definitions, ...(schema.definitions || [])].filter(Boolean).join(" ");
  }

  static async add<T extends WorkspaceColumnType = WorkspaceColumnType>(
    connection: WorkspaceConnection,
    tablePath: string,
    schema: WorkspaceColumnSchema<T>,
  ) {
    const definition = WorkspaceColumn.schemaToQueryDefinition(schema);
    await connection.client.execute(`\
      ALTER TABLE ${tablePath} ADD COLUMN ${definition}
    `);
    return new WorkspaceColumn<T>(connection, tablePath, schema.name);
  }

  static async drop(connection: WorkspaceConnection, tablePath: string, name: WorkspaceColumnSchema["name"]) {
    await connection.client.execute(`\
      ALTER TABLE ${tablePath} DROP COLUMN ${name}
    `);
  }

  async drop() {
    await WorkspaceColumn.drop(this._connection, this._tablePath, this.name);
  }

  async modify(schema: Partial<Omit<WorkspaceColumnSchema, "name">>) {
    const definition = WorkspaceColumn.schemaToQueryDefinition({ type: "", ...schema, name: this.name });
    await this._connection.client.execute(`\
      ALTER TABLE ${this._tablePath} MODIFY COLUMN ${definition}
    `);
  }

  async rename(newName: WorkspaceColumnSchema["name"]) {
    await this._connection.client.execute(`\
      ALTER TABLE ${this._tablePath} CHANGE ${this.name} ${newName}
    `);
  }
}
