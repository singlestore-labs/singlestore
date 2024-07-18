import { WorkspaceConnection } from "./connection";
import { WorkspaceTable, WorkspaceTableSchema } from "./table";

export interface WorkspaceDatabaseSchema {
  name: string;
  tables: WorkspaceTableSchema[];
  workspaceName?: string;
}

export class WorkspaceDatabase<T extends WorkspaceConnection, U extends WorkspaceDatabaseSchema["name"]> {
  constructor(
    private _connection: T,
    public name: U,
  ) {}

  table<T extends InstanceType<typeof WorkspaceTable>["name"]>(name: T) {
    return new WorkspaceTable(this._connection, this.name, name);
  }

  createTable<T extends WorkspaceTableSchema>(schema: T) {
    return WorkspaceTable.create(this._connection, this.name, schema);
  }

  dropTable(name: WorkspaceTableSchema["name"]) {
    return WorkspaceTable.drop(this._connection, this.name, name);
  }

  static async create<T extends WorkspaceConnection, U extends WorkspaceDatabaseSchema>(connection: T, schema: U) {
    const definitions: string[] = [`CREATE TABLE IF NOT EXISTS ${schema.name}`];
    if (schema.workspaceName) definitions.push(`ON WORKSPACE '${schema.workspaceName}'`);
    await connection.client.execute(definitions.join(" "));
    await Promise.all(schema.tables.map((table) => WorkspaceTable.create(connection, schema.name, table)));
    return new WorkspaceDatabase(connection, schema.name);
  }

  static async drop(connection: WorkspaceConnection, name: WorkspaceDatabaseSchema["name"]) {
    await connection.client.execute(`DROP DATABASE IF EXISTS ${name}`);
  }

  async drop(name: WorkspaceDatabaseSchema["name"]) {
    await WorkspaceDatabase.drop(this._connection, name);
  }
}
