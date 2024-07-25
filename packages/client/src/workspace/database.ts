import { ResultSetHeader } from "mysql2";
import { WorkspaceConnection } from "./connection";
import { WorkspaceTable, WorkspaceTableSchema, WorkspaceTableType } from "./table";

export interface WorkspaceDatabaseType {
  tables: Record<string, WorkspaceTableType>;
}

export interface WorkspaceDatabaseSchema<T extends WorkspaceDatabaseType> {
  name: string;
  tables: { [K in keyof T["tables"]]: Omit<WorkspaceTableSchema<T["tables"][K]>, "name"> };
}

export class WorkspaceDatabase<T extends WorkspaceDatabaseType> {
  constructor(
    private _connection: WorkspaceConnection,
    public workspaceName: string,
    public name: string,
  ) {}

  static async create<T extends WorkspaceDatabaseType>(
    connection: WorkspaceConnection,
    workspaceName: string,
    schema: WorkspaceDatabaseSchema<T>,
  ) {
    const clauses: string[] = [`CREATE DATABASE IF NOT EXISTS ${schema.name}`];
    if (workspaceName) clauses.push(`ON WORKSPACE \`${workspaceName}\``);
    await connection.client.execute<ResultSetHeader>(clauses.join(" "));

    await Promise.all(
      Object.entries(schema.tables).map(([name, tableSchema]) => {
        return WorkspaceTable.create(connection, schema.name, { ...tableSchema, name });
      }),
    );

    return new WorkspaceDatabase<T>(connection, workspaceName, schema.name);
  }

  static drop(connection: WorkspaceConnection, name: string) {
    return connection.client.execute<ResultSetHeader>(`DROP DATABASE IF EXISTS ${name}`);
  }

  drop() {
    return WorkspaceDatabase.drop(this._connection, this.name);
  }

  table<U extends Extract<keyof T["tables"], string>>(name: U) {
    return new WorkspaceTable<T["tables"][U]>(this._connection, this.name, name);
  }

  createTable<T extends WorkspaceTableType>(schema: WorkspaceTableSchema<T>) {
    return WorkspaceTable.create<T>(this._connection, this.name, schema);
  }

  dropTable(name: Extract<keyof T["tables"], string>) {
    return WorkspaceTable.drop(this._connection, this.name, name);
  }
}
