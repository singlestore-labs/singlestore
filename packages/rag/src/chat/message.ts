import type { WorkspaceDatabase, WorkspaceTable } from "@singlestore/client";
import type { ChatCompletionMessage } from "@singlestore/ai";
import type { ChatSession } from "./session";

export interface ChatMessageConfig extends Pick<ChatMessage, "sessionId" | "role" | "content" | "store" | "tableName"> {}

export interface ChatMessagesTable {
  columns: Pick<ChatMessage, "id" | "createdAt" | "sessionId" | "role" | "content">;
}

export class ChatMessage {
  constructor(
    private _database: WorkspaceDatabase,
    public id: number | undefined,
    public createdAt: string | undefined,
    public sessionId: ChatSession["id"],
    public role: ChatCompletionMessage["role"],
    public content: ChatCompletionMessage["content"],
    public store: boolean,
    public tableName: string,
  ) {}

  static createTable(database: WorkspaceDatabase, name: ChatMessage["tableName"]) {
    return database.createTable<ChatMessagesTable>({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        createdAt: { type: "DATETIME", default: "CURRENT_TIMESTAMP()" },
        sessionId: { type: "bigint", nullable: false },
        role: { type: "varchar(64)", nullable: false },
        content: { type: "text", nullable: false },
      },
    });
  }

  static async create(database: WorkspaceDatabase, config: ChatMessageConfig) {
    const { sessionId, role, content, store, tableName } = config;
    const createdAt: ChatMessage["createdAt"] = new Date().toISOString().replace("T", " ").substring(0, 19);
    let id: ChatMessage["id"];

    if (store) {
      const [rows] = await database.table<ChatMessagesTable>(tableName).insert({ createdAt, sessionId, role, content });
      id = rows?.[0].insertId;
    }

    return new ChatMessage(database, id, createdAt, sessionId, role, content, store, tableName);
  }

  static delete(
    database: WorkspaceDatabase,
    tableName: ChatMessage["tableName"],
    filters?: Parameters<WorkspaceTable<ChatMessagesTable>["delete"]>[0],
  ) {
    return database.table<ChatMessagesTable>(tableName).delete(filters);
  }

  delete() {
    return ChatMessage.delete(this._database, this.tableName, { id: this.id });
  }
}
