import type { RowDataPacket } from "mysql2";
import type { AI } from "@singlestore/ai";
import { WorkspaceConnection, type WorkspaceConnectionConfig } from "./connection";
import { WorkspaceDatabase, type WorkspaceDatabaseSchema, type WorkspaceDatabaseType } from "./database";

export interface WorkspaceType {
  databases: Record<string, WorkspaceDatabaseType>;
}

export interface WorkspaceSchema<T extends WorkspaceType> {
  name: string;
  databases: { [K in keyof T["databases"]]: Omit<WorkspaceDatabaseSchema<T["databases"][K]>, "name"> };
}

export class Workspace<
  T extends WorkspaceType,
  _DatabaseNames extends Extract<keyof T["databases"], string> = Extract<keyof T["databases"], string>,
> {
  constructor(
    public connection: WorkspaceConnection,
    public name?: string,
    private _ai?: AI,
  ) {}

  static connect<T extends WorkspaceType>({
    ai,
    name,
    ...config
  }: Partial<Pick<WorkspaceSchema<T>, "name">> & Omit<WorkspaceConnectionConfig, "name"> & { ai?: AI }) {
    const connection = new WorkspaceConnection(config);
    return new Workspace<T>(connection, name, ai);
  }

  database<U, K extends _DatabaseNames | (string & {}) = _DatabaseNames | (string & {})>(name: K) {
    return new WorkspaceDatabase<U extends WorkspaceDatabaseType ? U : T["databases"][K]>(
      this.connection,
      name as string,
      this.name,
      this._ai,
    );
  }

  createDatabase<T extends WorkspaceDatabaseType>(schema: WorkspaceDatabaseSchema<T>) {
    return WorkspaceDatabase.create<T>(this.connection, schema, this.name, this._ai);
  }

  dropDatabase(name: _DatabaseNames | ({} & string)) {
    return WorkspaceDatabase.drop(this.connection, name);
  }

  async showDatabasesInfo<U extends boolean>(extended?: U) {
    const clauses = ["SHOW DATABASES"];
    if (extended) clauses.push("EXTENDED");
    const result = await this.connection.client.query<(any & RowDataPacket)[]>(clauses.join(" "));
    return result[0].map((result) => WorkspaceDatabase.normalizeShowInfo<_DatabaseNames, U>(result, extended));
  }
}
