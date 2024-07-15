import { MongoClient, type MongoClientOptions } from "mongodb";
import { type Pool, type PoolOptions } from "mysql2/promise";
import { WorkspaceType } from "../types";

export abstract class AbstractWorkspaceConnection<T extends WorkspaceType = any> {
  abstract readonly type: T;
  protected _client: (T extends "sql" ? Pool : InstanceType<typeof MongoClient>) | undefined;

  constructor(
    public readonly config: T extends "sql"
      ? { host: string; user: string; password: string } & Partial<Omit<PoolOptions, "host" | "user" | "password" | "database">>
      : { url: string } & Partial<MongoClientOptions>,
  ) {}

  get client(): T extends "sql" ? Pool : InstanceType<typeof MongoClient> {
    if (!this._client) throw new Error("Not connected");
    return this._client;
  }

  abstract connect(): Promise<void>;

  abstract disconnect(): Promise<void>;
}
