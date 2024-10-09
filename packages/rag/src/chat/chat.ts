import type { AnyAI, AnyChatCompletionTool } from "@singlestore/ai";
import type { AnyDatabase, DatabaseType, Table, TableName } from "@singlestore/client";

import { ChatSession, ChatSessionManager } from "./session";

export interface ChatSchema<TTools extends AnyChatCompletionTool[] | undefined = undefined> {
  id: number;
  name: string;
  systemRole: string;
  store: boolean;
  tableName: TableName;
  sessionsTableName: TableName;
  messagesTableName: TableName;
  createdAt: string;
  tools: TTools;
}

export interface ChatTable extends Omit<ChatSchema, "store" | "tools"> {}

export class Chat<TAI extends AnyAI, TTools extends AnyChatCompletionTool[] | undefined = undefined> {
  session: ChatSessionManager<TAI, TTools>;

  constructor(
    private _database: AnyDatabase,
    private _ai: TAI,
    public id: ChatSchema["id"] | undefined,
    public name: ChatSchema["name"],
    public systemRole: ChatSchema["systemRole"],
    public store: ChatSchema["store"],
    public tableName: ChatSchema["tableName"],
    public sessionsTableName: ChatSchema["sessionsTableName"],
    public messagesTableName: ChatSchema["messagesTableName"],
    public createdAt: ChatSchema["createdAt"] | undefined,
    private _tools: TTools,
  ) {
    this.session = new ChatSessionManager(
      this._database,
      this._ai,
      this.id,
      this.systemRole,
      this.store,
      this.sessionsTableName,
      this.messagesTableName,
      this._tools,
    );
  }

  static async update(
    database: AnyDatabase,
    tableName: TableName,
    ...args: Parameters<Table<TableName, ChatTable, DatabaseType, AnyAI>["update"]>
  ) {
    return database.table.use<TableName, ChatTable>(tableName).update(...args);
  }

  static async delete(
    database: AnyDatabase,
    tableName: TableName = "chats",
    sessionsTable: TableName = "chat_sessions",
    messagesTableName: TableName = "chat_messages",
    ...[where]: Parameters<Table<TableName, ChatTable, DatabaseType, AnyAI>["delete"]>
  ) {
    const table = database.table.use<TableName, ChatTable>(tableName);
    const deletedRowIds = await table.find({ select: ["id"], where });

    return Promise.all([
      table.delete(where),
      ChatSession.delete(database, sessionsTable, messagesTableName, { chatID: { in: deletedRowIds.map(({ id }) => id!) } }),
    ]);
  }

  async update(...[values]: Parameters<typeof Chat.update> extends [any, any, ...infer Rest, any] ? Rest : never) {
    const result = await Chat.update(this._database, this.tableName, values, { id: this.id });

    for (const [key, value] of Object.entries(values)) {
      if (key in this) {
        (this as any)[key] = value;
      }
    }

    return result;
  }

  async delete() {
    return Chat.delete(this._database, this.tableName, this.sessionsTableName, this.messagesTableName, { id: this.id });
  }
}
