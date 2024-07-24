import { FlexKeyOf } from "../types/helpers";
import { WorkspaceConnection } from "./connection";
import { WorkspaceTable, WorkspaceTableSchema, WorkspaceTableType } from "./table";

export interface WorkspaceDatabaseType {
  name?: string;
  tables: Record<string, WorkspaceTableType>;
}

export interface WorkspaceDatabaseSchema<T extends WorkspaceDatabaseType = WorkspaceDatabaseType> {
  name: Exclude<T["name"], undefined>;
  tables: { [K in keyof T["tables"]]: Omit<WorkspaceTableSchema<T["tables"][K]>, "name"> };
  workspace?: string;
}

export class WorkspaceDatabase<T extends WorkspaceDatabaseType = WorkspaceDatabaseType> {
  constructor(
    private _connection: WorkspaceConnection,
    public name: WorkspaceDatabaseSchema["name"],
  ) {}

  static async create<T extends WorkspaceDatabaseType>(connection: WorkspaceConnection, schema: WorkspaceDatabaseSchema<T>) {
    const clauses: string[] = [`CREATE DATABASE IF NOT EXISTS ${schema.name}`];
    if (schema.workspace) clauses.push(`ON WORKSPACE \`${schema.workspace}\``);
    await connection.client.execute(clauses.join(" "));

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

  createTable<T extends WorkspaceTableType>(schema: WorkspaceTableSchema<T>) {
    return WorkspaceTable.create<T>(this._connection, this.name, schema);
  }

  dropTable(name: FlexKeyOf<T["tables"]>) {
    return WorkspaceTable.drop(this._connection, this.name, name);
  }
}
