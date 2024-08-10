import type { AI } from "@singlestore/ai";
import { WorkspaceConnection, type WorkspaceConnectionConfig } from "./connection";
import {
  WorkspaceDatabase,
  WorkspaceDatabaseShowInfo,
  WorkspaceDatabaseShowInfoExtended,
  type WorkspaceDatabaseSchema,
  type WorkspaceDatabaseType,
} from "./database";

export interface WorkspaceType {
  databases: Record<string, WorkspaceDatabaseType>;
}

export interface WorkspaceSchema<T extends WorkspaceType> {
  name: string;
  databases: { [K in keyof T["databases"]]: Omit<WorkspaceDatabaseSchema<T["databases"][K]>, "name"> };
}

export class Workspace<
  T extends WorkspaceType = WorkspaceType,
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

  async showDatabasesInfo<
    U extends boolean,
    _ReturnType = U extends true ? WorkspaceDatabaseShowInfoExtended[] : WorkspaceDatabaseShowInfo[],
  >(extended?: U): Promise<_ReturnType> {
    const clauses = ["SHOW DATABASES"];
    const [rows] = await this.connection.client.query<any[]>(clauses.join(" "));
    const databaseNames = rows.map((row) => Object.values(row)[0] as string);

    if (!extended) {
      return databaseNames.map((name) => ({ name }) satisfies WorkspaceDatabaseShowInfo) as _ReturnType;
    }

    return (await Promise.all(
      databaseNames.map((name) => WorkspaceDatabase.showInfo(this.connection, name, extended)),
    )) as _ReturnType;
  }
}
