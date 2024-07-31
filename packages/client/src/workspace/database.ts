import type { ResultSetHeader } from "mysql2/promise";
import type { AI } from "@singlestore/ai";
import { WorkspaceConnection } from "./connection";
import { WorkspaceTable, type WorkspaceTableSchema, type WorkspaceTableType } from "./table";

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
    private _ai?: AI,
  ) {}

  static async create<T extends WorkspaceDatabaseType>(
    connection: WorkspaceConnection,
    workspaceName: string,
    schema: WorkspaceDatabaseSchema<T>,
    ai?: AI,
  ) {
    const clauses: string[] = [`CREATE DATABASE IF NOT EXISTS ${schema.name}`];
    if (workspaceName) clauses.push(`ON WORKSPACE \`${workspaceName}\``);
    await connection.client.execute<ResultSetHeader>(clauses.join(" "));

    await Promise.all(
      Object.entries(schema.tables).map(([name, tableSchema]) => {
        return WorkspaceTable.create(connection, schema.name, { ...tableSchema, name });
      }),
    );

    return new WorkspaceDatabase<T>(connection, workspaceName, schema.name, ai);
  }

  static drop(connection: WorkspaceConnection, name: string) {
    return connection.client.execute<ResultSetHeader>(`DROP DATABASE IF EXISTS ${name}`);
  }

  drop() {
    return WorkspaceDatabase.drop(this._connection, this.name);
  }

  table<U extends Extract<keyof T["tables"], string>>(name: U) {
    return new WorkspaceTable<T["tables"][U]>(this._connection, this.name, name, this._ai);
  }

  createTable<T extends WorkspaceTableType>(schema: WorkspaceTableSchema<T>) {
    return WorkspaceTable.create<T>(this._connection, this.name, schema, this._ai);
  }

  dropTable(name: ({} & string) | Extract<keyof T["tables"], string>) {
    return WorkspaceTable.drop(this._connection, this.name, name);
  }

  async query<T extends any[]>(statement: string) {
    const statements = [`USE ${this.name}`, statement].join(";\n");
    const result = await this._connection.client.execute<T>(statements);
    return result[0].slice(1) as T;
  }
}
