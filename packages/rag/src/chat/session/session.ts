import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, DatabaseType, Table, TableName } from "@singlestore/client";

import { ChatMessageManager } from "../message";

export interface ChatSessionSchema<TTools extends AnyChatCompletionTool[] | undefined = undefined> {
  chatID: number;
  id: number;
  name: string;
  systemRole: string;
  store: boolean;
  tableName: TableName;
  messagesTableName: TableName;
  createdAt: string;
  tools: TTools;
}

export interface ChatSessionTable extends Pick<ChatSessionSchema, "chatID" | "id" | "name" | "createdAt"> {}

export class ChatSession<TAI extends AnyAI, TTools extends AnyChatCompletionTool[] | undefined = undefined> {
  message: ChatMessageManager;

  constructor(
    private _database: AnyDatabase,
    private _ai: TAI,
    public chatID: ChatSessionSchema["chatID"] | undefined,
    public id: ChatSessionSchema["id"] | undefined,
    public name: ChatSessionSchema["name"],
    public systemRole: ChatSessionSchema["systemRole"],
    public store: ChatSessionSchema["store"],
    public tableName: ChatSessionSchema["tableName"],
    public messagesTableName: ChatSessionSchema["messagesTableName"],
    public createdAt: ChatSessionSchema["createdAt"] | undefined,
    public tools: TTools,
  ) {
    this.message = new ChatMessageManager(this._database, this.messagesTableName, this.store, this.id);
  }

  static async update(
    database: AnyDatabase,
    tableName: TableName = "chat_sessions",
    ...args: Parameters<Table<TableName, ChatSessionTable, DatabaseType, AnyAI>["update"]>
  ) {
    return database.table.use<TableName, ChatSessionTable>(tableName).update(...args);
  }

  static async delete(
    database: AnyDatabase,
    tableName: TableName = "chat_sessions",
    messagesTableName: TableName = "chat_messages",
    ...[where]: Parameters<Table<TableName, ChatSessionTable, DatabaseType, AnyAI>["delete"]>
  ) {
    const table = database.table.use<TableName, ChatSessionTable>(tableName);
    const deletedRowIds = await table.find({ select: ["id"], where });

    return Promise.all([
      table.delete(where),
      // ChatMessage.delete(database, messagesTableName, { sessionId: { in: deletedRowIds.map(({ id }) => id!) } }),
    ]);
  }

  async update(...[values]: Parameters<typeof ChatSession.update> extends [any, any, ...infer Rest, any] ? Rest : never) {
    const result = await ChatSession.update(this._database, this.tableName, values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  async delete() {
    return ChatSession.delete(this._database, this.tableName, this.messagesTableName, { id: this.id });
  }
}
