import { WorkspaceConnection } from "./connection";
import { WorkspaceTable, WorkspaceTableSchema } from "./table";

export interface WorkspaceDatabaseSchema {
  name: string;
  tables: WorkspaceTableSchema[];
  workspace?: string;
}

export class WorkspaceDatabase<T extends WorkspaceConnection, U extends WorkspaceDatabaseSchema["name"]> {
  constructor(
    private _connection: T,
    public name: U,
  ) {}

  table<T extends InstanceType<typeof WorkspaceTable>["name"]>(name: T) {
    return new WorkspaceTable(this._connection, this.name, name);
  }

  async createTable<T extends WorkspaceTableSchema>(schema: T) {
    await WorkspaceTable.create(this._connection, this.name, schema);
  }

  async dropTable(name: WorkspaceTableSchema["name"]) {
    await WorkspaceTable.drop(this._connection, this.name, name);
  }

  static async create<T extends WorkspaceConnection, U extends WorkspaceDatabaseSchema>(connection: T, schema: U) {
    const definitions: string[] = [`CREATE TABLE IF NOT EXISTS ${schema.name}`];
    if (schema.workspace) definitions.push(`ON WORKSPACE '${schema.workspace}'`);
    await connection.client.execute(definitions.join(" "));
    await Promise.all(schema.tables.map((table) => WorkspaceTable.create(connection, schema.name, table)));
  }

  static async drop(connection: WorkspaceConnection, name: WorkspaceDatabaseSchema["name"]) {
    await connection.client.execute(`DROP DATABASE IF EXISTS ${name}`);
  }

  async drop(name: WorkspaceDatabaseSchema["name"]) {
    await WorkspaceDatabase.drop(this._connection, name);
  }
}
