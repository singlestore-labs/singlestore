import { MongoClient } from "mongodb";
import { AbstractWorkspaceConnection } from "./abstract";

export class KaiWorkspaceConnection extends AbstractWorkspaceConnection<"kai"> {
  type = "kai" as const;

  async connect(): Promise<void> {
    const { url, ...options } = this.config;
    const client = new MongoClient(url, options as any);
    await client.connect();
    this._client = client;
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    this._client = undefined;
  }
}

export function isKaiWorkspaceConnectionConfig(value: any): value is KaiWorkspaceConnection["config"] {
  return typeof value === "object" && value && value.url;
}

export function isKaiWorkspaceConnection(value: any): value is KaiWorkspaceConnection {
  return typeof value === "object" && value && "type" in value && value.type === "kai";
}
