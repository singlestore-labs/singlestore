import { FlexKeyOf } from "../types/helpers";
import { WorkspaceConnection } from "./connection";
import { WorkspaceTable, WorkspaceTableSchema } from "./table";

export interface WorkspaceDatabaseSchema<
  T extends Record<string, WorkspaceTableSchema> = Record<string, WorkspaceTableSchema>,
> {
  name: string;
  tables: T;
  workspace?: string;
}

export class WorkspaceDatabase<T extends WorkspaceDatabaseSchema> {
  constructor(
    private _connection: WorkspaceConnection,
    public name: T["name"],
  ) {}

  static async create<T extends WorkspaceDatabaseSchema>(connection: WorkspaceConnection, schema: T) {
    const definitions: string[] = [`CREATE DATABASE IF NOT EXISTS ${schema.name}`];
    if (schema.workspace) definitions.push(`ON WORKSPACE '${schema.workspace}'`);
    await connection.client.execute(definitions.join(" "));

    await Promise.all(
      Object.entries(schema.tables).map(([name, tableSchema]) => {
        return WorkspaceTable.create(connection, schema.name, { ...tableSchema, name });
      }),
    );

    return new WorkspaceDatabase<T>(connection, schema.name);
  }

  static async drop(connection: WorkspaceConnection, name: WorkspaceDatabaseSchema["name"]) {
    await connection.client.execute(`DROP DATABASE IF EXISTS ${name}`);
  }

  async drop() {
    await WorkspaceDatabase.drop(this._connection, this.name);
  }

  table<U extends FlexKeyOf<T["tables"]>>(name: U) {
    return new WorkspaceTable<T["tables"][U]>(this._connection, this.name, name);
  }

  createTable<T extends WorkspaceTableSchema = WorkspaceTableSchema>(schema: T) {
    return WorkspaceTable.create<T>(this._connection, this.name, schema);
  }

  dropTable(name: FlexKeyOf<T["tables"]>) {
    return WorkspaceTable.drop(this._connection, this.name, name);
  }
}
