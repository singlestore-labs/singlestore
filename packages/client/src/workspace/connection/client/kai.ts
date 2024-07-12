import { MongoClient, type MongoClientOptions } from "mongodb";
import { WorkspaceConnectionClient } from "./abstract";

export class KaiWorkspaceConnectionClient extends WorkspaceConnectionClient {
  type = "kai" as const;
  protected _connection: InstanceType<typeof MongoClient> | undefined;

  constructor(public config: { url: string } & Partial<MongoClientOptions>) {
    super(config);
  }

  get connection() {
    if (!this._connection) throw new Error("Not connected");
    return this._connection;
  }

  async connect(): Promise<void> {
    const { url, ...options } = this.config;
    const client = new MongoClient(url, options as any);
    await client.connect();
    this._connection = client;
  }

  async disconnect(): Promise<void> {
    await this.connection.close();
    this._connection = undefined;
  }
}

export function isKaiWorkspaceClientConfig(config: any): config is KaiWorkspaceConnectionClient["config"] {
  return typeof config === "object" && config && config.url;
}
